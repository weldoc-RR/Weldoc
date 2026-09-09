import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";

const RevueSchema = z.object({
  conclusion: z.enum(["CONFORME", "NON_CONFORME"]),
  commentaire: z.string().optional(),
});

// POST /api/pv-externes/[id]/revue — revue d'un document externe (voir le
// cahier des charges : "Revue par une personne habilitée... revue
// tracée"), réservée au niveau 3. Une fois faite, elle n'est jamais
// modifiée : un document corrigé se réimporte comme un nouveau PV externe
// plutôt que d'écraser cette revue.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = RevueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pvExterne = await prisma.pVExterne.findUnique({ where: { id: params.id } });
  if (!pvExterne) {
    return NextResponse.json({ error: "PV externe introuvable." }, { status: 404 });
  }
  if (pvExterne.revueConclusion) {
    return NextResponse.json({ error: "Ce document a déjà été revu." }, { status: 422 });
  }

  const misAJour = await prisma.pVExterne.update({
    where: { id: params.id },
    data: {
      revueConclusion: parsed.data.conclusion,
      revueCommentaire: parsed.data.commentaire,
      revueParId: droits.utilisateur.personnelId,
      dateRevue: new Date(),
    },
  });

  return NextResponse.json(misAJour);
}
