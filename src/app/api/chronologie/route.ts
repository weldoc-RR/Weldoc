import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  date: z.string().datetime(),
  description: z.string().min(1),
});

// GET /api/chronologie?affaireId=... — résumé chronologique de
// l'intervention (voir "Résumé de l'intervention" du modèle réel).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const evenements = await prisma.evenementChronologie.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(evenements);
}

// POST /api/chronologie
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: parsed.data.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const evenement = await prisma.evenementChronologie.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });
  return NextResponse.json(evenement, { status: 201 });
}
