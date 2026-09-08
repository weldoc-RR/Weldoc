import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const CreatePersonnelSchema = z.object({
  matricule: z.string().min(1),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  societe: z.string().min(1),
  niveau: z.enum(["NIVEAU_1", "NIVEAU_2", "NIVEAU_3"]),
});

// GET /api/personnel — liste le personnel (identité uniquement).
export async function GET() {
  const personnel = await prisma.personnel.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, matricule: true, nom: true, prenom: true, societe: true, niveau: true },
  });
  return NextResponse.json(personnel);
}

// POST /api/personnel — crée une fiche personne minimale (identité + niveau).
// Volontairement réduit à ces champs pour l'instant : le module "personnel /
// qualifications" (fonctions, qualifications, habilitations, acuités
// visuelles...) reste à construire séparément et étendra cette fiche sans la
// dupliquer, conformément au principe "une donnée saisie une seule fois".
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreatePersonnelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const personnel = await prisma.personnel.create({
    data: {
      ...parsed.data,
      qrCodeValeur: randomBytes(16).toString("hex"),
    },
  });

  return NextResponse.json(personnel, { status: 201 });
}
