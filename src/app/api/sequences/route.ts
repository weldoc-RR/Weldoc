import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSequenceSchema = z.object({
  affaireId: z.string().min(1),
  ordre: z.number().int(),
  nom: z.string().min(1),
});

// GET /api/sequences?affaireId=... — les séquences d'une affaire (5 par
// défaut à la création), avec leurs phases.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const sequences = await prisma.sequence.findMany({
    where: { affaireId: affaireId ?? undefined },
    include: { phases: { orderBy: { ordre: "asc" } } },
    orderBy: { ordre: "asc" },
  });
  return NextResponse.json(sequences);
}

// POST /api/sequences — ajoute une séquence au-delà des 5 par défaut, pour
// un séquencement adapté (niveau 2 minimum).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSequenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sequence = await prisma.sequence.create({ data: parsed.data });
  return NextResponse.json(sequence, { status: 201 });
}
