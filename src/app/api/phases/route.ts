import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { verifierSequencementAutorise } from "@/lib/sequencement";

const CreatePhaseSchema = z.object({
  sequenceId: z.string().min(1),
  ordre: z.number().int(),
  nom: z.string().min(1),
  obligatoire: z.boolean().optional(),
});

// GET /api/phases?sequenceId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const sequenceId = req.nextUrl.searchParams.get("sequenceId");
  const phases = await prisma.phase.findMany({
    where: { sequenceId: sequenceId ?? undefined },
    orderBy: { ordre: "asc" },
  });
  return NextResponse.json(phases);
}

// POST /api/phases — ajoute une phase à une séquence (niveau 2 minimum).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreatePhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const phase = await prisma.phase.create({ data: parsed.data });
  return NextResponse.json(phase, { status: 201 });
}

const UpdatePhaseSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["A_FAIRE", "EN_COURS", "TERMINEE", "NON_APPLICABLE"]),
  justificationNA: z.string().optional(),
});

// PATCH /api/phases — fait avancer une phase. Passer en EN_COURS ou
// TERMINEE est refusé si une séquence précédente de la même affaire n'est
// pas terminée, sauf dérogation accordée par une demande de modification de
// séquencement acceptée (voir src/lib/sequencement.ts). Passer en
// NON_APPLICABLE exige une justification, comme demandé au cahier des
// charges ("N/A avec justification").
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = UpdatePhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, statut, justificationNA } = parsed.data;

  if (statut === "NON_APPLICABLE" && !justificationNA?.trim()) {
    return NextResponse.json(
      { error: "Une justification est requise pour marquer une phase non applicable." },
      { status: 400 }
    );
  }

  if (statut === "EN_COURS" || statut === "TERMINEE") {
    const { autorise, motif } = await verifierSequencementAutorise(id);
    if (!autorise) {
      return NextResponse.json({ error: motif }, { status: 422 });
    }
  }

  const phase = await prisma.phase.update({
    where: { id },
    data: { statut, justificationNA: statut === "NON_APPLICABLE" ? justificationNA : undefined },
  });

  return NextResponse.json(phase);
}
