import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";
import { tracerModification } from "@/lib/auditTrail";

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

  // Contrairement aux qualifications/points réglementaires (leur propre
  // historique d'événements), cette validation n'est qu'un champ posé une
  // fois sur le document lui-même : sans cette trace, elle n'apparaîtrait
  // dans aucune vue d'ensemble des actions sensibles (voir /audit).
  await tracerModification({
    utilisateurId: droits.utilisateur.personnelId,
    entite: "DocumentExterne",
    entiteId: document.id,
    nouvelleValeur: { conclusion: parsed.data.conclusion, commentaire: parsed.data.commentaire },
    motif: "Validation d'un document externe.",
  });

  return NextResponse.json(misAJour);
}
