import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";

const AjouterFonctionSchema = z.object({
  fonction: z.string().min(1),
});

// POST /api/personnel/[id]/fonctions — ajoute une fonction (soudeur,
// contrôleur, contrôleur CND, chargé de travaux...) à une personne. Une
// personne peut cumuler plusieurs fonctions ; on ajoute, on ne remplace rien.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = AjouterFonctionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const personnel = await prisma.personnel.findUnique({ where: { id: params.id } });
  if (!personnel) {
    return NextResponse.json({ error: "Personnel introuvable." }, { status: 404 });
  }

  // upsert() utilise une transaction en interne, non supportée par le
  // pilote HTTP (voir la remarque dans src/lib/prisma.ts) : on fait donc
  // l'équivalent à la main, en deux requêtes séquentielles.
  const existante = await prisma.personnelFonction.findUnique({
    where: { personnelId_fonction: { personnelId: params.id, fonction: parsed.data.fonction } },
  });
  const fonction =
    existante ??
    (await prisma.personnelFonction.create({
      data: { personnelId: params.id, fonction: parsed.data.fonction },
    }));

  return NextResponse.json(fonction, { status: existante ? 200 : 201 });
}
