import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const PatchSchema = z.object({
  zone: z.string().optional(),
  observations: z.string().optional(),
  degradationsConstatees: z.string().optional(),
  documentsEntree: z.string().optional(),
  signatureId: z.string().optional(),
});

// PATCH /api/etats-des-lieux/[id] — complète le constat. Modifiable tant
// qu'il n'est pas signé ; une fois `signatureId` renseigné, plus aucune
// modification n'est acceptée (même principe que la fiche technique de
// suivi de soudage) : la signature atteste le constat comme définitif.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const etatDesLieux = await prisma.etatDesLieux.findUnique({ where: { id: params.id } });
  if (!etatDesLieux) {
    return NextResponse.json({ error: "Constat introuvable." }, { status: 404 });
  }
  if (etatDesLieux.signatureId) {
    return NextResponse.json({ error: "Ce constat est déjà signé : il ne peut plus être modifié." }, { status: 422 });
  }

  if (parsed.data.signatureId) {
    const signature = await prisma.signature.findUnique({ where: { id: parsed.data.signatureId } });
    if (!signature || signature.documentType !== "ETAT_DES_LIEUX" || signature.documentId !== params.id) {
      return NextResponse.json({ error: "Signature introuvable ou ne correspond pas à ce constat." }, { status: 422 });
    }
  }

  const misAJour = await prisma.etatDesLieux.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(misAJour);
}
