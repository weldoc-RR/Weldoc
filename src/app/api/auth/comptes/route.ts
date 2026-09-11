import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashMotDePasse, requireNiveau } from "@/lib/auth";

const CreerCompteSchema = z.object({
  personnelId: z.string().min(1),
  motDePasse: z.string().min(8, "8 caractères minimum."),
});

// POST /api/auth/comptes — crée le compte de connexion d'une personne déjà
// enregistrée (Personnel). Réservé au niveau 3 (coordinateur, responsable...),
// SAUF pour le tout premier compte de l'entreprise : tant qu'aucun compte
// n'existe encore, personne ne peut être authentifié pour en créer un, donc
// ce premier compte s'amorce librement (schéma classique de "bootstrap").
// Une fois ce premier compte créé, cette porte se referme automatiquement.
export async function POST(req: NextRequest) {
  const nombreComptes = await prisma.compte.count();

  if (nombreComptes > 0) {
    const droits = await requireNiveau(req, "NIVEAU_3");
    if ("erreur" in droits) return droits.erreur;
  }

  const body = await req.json();
  const parsed = CreerCompteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { personnelId, motDePasse } = parsed.data;

  const personnel = await prisma.personnel.findUnique({ where: { id: personnelId } });
  if (!personnel) {
    return NextResponse.json({ error: "Personnel introuvable." }, { status: 404 });
  }

  const motDePasseHash = await hashMotDePasse(motDePasse);

  const compte = await prisma.compte.create({
    data: { personnelId, motDePasseHash },
  });

  return NextResponse.json(
    { id: compte.id, personnelId: compte.personnelId, statut: compte.statut },
    { status: 201 }
  );
}
