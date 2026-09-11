import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateEvenementSchema = z.object({
  statut: z.enum(["NON_BLOQUANT", "BLOQUANT", "SOUS_RESERVE", "ATTENTE_DECISION", "DEBLOCAGE_AUTORISE"]),
  commentaire: z.string().optional(),
  // Signature du déblocage (voir POST /api/signatures, documentType
  // "POINT_REGLEMENTAIRE"), exigée pour DEBLOCAGE_AUTORISE.
  signatureId: z.string().optional(),
});

// POST /api/points-reglementaires/[id]/evenements — fait avancer
// l'historique d'un point réglementaire. Ne remplace jamais l'événement
// précédent : chaque changement de statut est un nouvel enregistrement.
// Passer en DEBLOCAGE_AUTORISE est réservé au niveau 3 et exige une
// signature déjà créée pour ce point précis : Weldoc ne lève jamais seul
// un point bloquant.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = CreateEvenementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const auth =
    parsed.data.statut === "DEBLOCAGE_AUTORISE" ? await requireNiveau(req, "NIVEAU_3") : await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const point = await prisma.pointReglementaire.findUnique({ where: { id: params.id } });
  if (!point) {
    return NextResponse.json({ error: "Point réglementaire introuvable." }, { status: 404 });
  }

  if (parsed.data.statut === "DEBLOCAGE_AUTORISE") {
    if (!parsed.data.signatureId) {
      return NextResponse.json({ error: "Une signature est requise pour autoriser le déblocage." }, { status: 400 });
    }
    const signature = await prisma.signature.findUnique({ where: { id: parsed.data.signatureId } });
    if (!signature || signature.documentType !== "POINT_REGLEMENTAIRE" || signature.documentId !== params.id) {
      return NextResponse.json({ error: "Signature introuvable ou ne correspond pas à ce point." }, { status: 422 });
    }
  }

  const evenement = await prisma.pointReglementaireEvenement.create({
    data: {
      pointReglementaireId: point.id,
      statut: parsed.data.statut,
      commentaire: parsed.data.commentaire,
      signatureId: parsed.data.signatureId,
      auteurId: auth.utilisateur.personnelId,
    },
  });

  return NextResponse.json(evenement, { status: 201 });
}
