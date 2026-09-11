import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreatePersonnelSchema = z.object({
  matricule: z.string().min(1),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  societe: z.string().min(1),
  niveau: z.enum(["NIVEAU_1", "NIVEAU_2", "NIVEAU_3"]),
  fonctions: z.array(z.string().min(1)).optional(),
});

// GET /api/personnel — liste le personnel (identité + fonctions). Le détail
// complet (qualifications, habilitations, formations...) est sur
// GET /api/personnel/[id].
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnel = await prisma.personnel.findMany({
    orderBy: { nom: "asc" },
    select: {
      id: true,
      matricule: true,
      nom: true,
      prenom: true,
      societe: true,
      niveau: true,
      fonctions: { select: { fonction: true } },
    },
  });
  return NextResponse.json(personnel);
}

// POST /api/personnel — crée une fiche personne (identité + niveau +
// fonctions éventuelles). Réservé au niveau 2 minimum, SAUF pour la toute
// première fiche de l'entreprise (base vide) : c'est celle qui amorce le
// compte niveau 3 qui pourra ensuite en créer d'autres — même logique de
// bootstrap que pour /api/auth/comptes.
export async function POST(req: NextRequest) {
  const nombrePersonnel = await prisma.personnel.count();

  if (nombrePersonnel > 0) {
    const droits = await requireNiveau(req, "NIVEAU_2");
    if ("erreur" in droits) return droits.erreur;
  }

  const body = await req.json();
  const parsed = CreatePersonnelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { fonctions, ...donnees } = parsed.data;

  // Écritures séquentielles plutôt qu'une création imbriquée : le pilote
  // HTTPS utilisé pour joindre la base ne supporte pas les transactions,
  // or une création imbriquée (personnel + fonctions en une seule requête)
  // en a besoin en interne.
  const personnel = await prisma.personnel.create({
    data: { ...donnees, qrCodeValeur: randomBytes(16).toString("hex") },
  });

  if (fonctions && fonctions.length > 0) {
    for (const fonction of fonctions) {
      await prisma.personnelFonction.create({ data: { personnelId: personnel.id, fonction } });
    }
  }

  const personnelAvecFonctions = await prisma.personnel.findUniqueOrThrow({
    where: { id: personnel.id },
    include: { fonctions: true },
  });

  return NextResponse.json(personnelAvecFonctions, { status: 201 });
}
