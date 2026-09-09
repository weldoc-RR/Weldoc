import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";

const ValidationSchema = z.object({
  conclusion: z.enum(["CONFORME", "NON_CONFORME"]),
  commentaire: z.string().optional(),
});

// POST /api/documents-externes/[id]/validation — validation d'un document
// externe par une personne habilitée (niveau 3), comme demandé au cahier
// des charges ("auteur, validateur, statut"). Une fois faite, elle n'est
// jamais modifiée : un document corrigé se réimporte comme un nouveau
// DocumentExterne (nouvelle révision) plutôt que d'écraser cette
// validation — même principe que la revue des PV externes.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = ValidationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const document = await prisma.documentExterne.findUnique({ where: { id: params.id } });
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }
  if (document.valideConclusion) {
    return NextResponse.json({ error: "Ce document a déjà été validé." }, { status: 422 });
  }

  const misAJour = await prisma.documentExterne.update({
    where: { id: params.id },
    data: {
      valideConclusion: parsed.data.conclusion,
      valideCommentaire: parsed.data.commentaire,
      valideParId: droits.utilisateur.personnelId,
      dateValidation: new Date(),
    },
  });
  return NextResponse.json(misAJour);
}
