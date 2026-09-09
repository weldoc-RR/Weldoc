import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const FicheSchema = z.object({
  procede: z.string().optional(),
  preechauffageC: z.number().optional(),
  temperatureInterpasses: z.number().optional(),
  postchauffageC: z.number().optional(),
  tensionV: z.number().optional(),
  intensiteA: z.number().optional(),
  vitesseMmMin: z.number().optional(),
  energieKJMm: z.number().optional(),
  nombrePasses: z.number().int().optional(),
  tempsMin: z.number().optional(),
  observations: z.string().optional(),
  photosUrls: z.array(z.string()).optional(),
  signatureId: z.string().optional(),
});

// GET /api/joints/[id]/fiche-soudage — la fiche de suivi de soudage du
// joint (identification/soudeur/QS/WPS/QMOS/consommable déjà sur Joint,
// jamais redemandés ici).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const fiche = await prisma.ficheTechniqueSoudage.findUnique({ where: { jointId: params.id } });
  return NextResponse.json(fiche);
}

// PATCH /api/joints/[id]/fiche-soudage — remplit ou complète la fiche, en
// écritures séquentielles (pas de .upsert(), voir src/lib/prisma.ts).
// Modifiable tant qu'elle n'est pas signée ; une fois `signatureId`
// renseigné, plus aucune modification n'est acceptée (la signature
// atteste des valeurs comme définitives).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = FicheSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const joint = await prisma.joint.findUnique({ where: { id: params.id } });
  if (!joint) {
    return NextResponse.json({ error: "Joint introuvable." }, { status: 404 });
  }

  const existante = await prisma.ficheTechniqueSoudage.findUnique({ where: { jointId: params.id } });
  if (existante?.signatureId) {
    return NextResponse.json({ error: "Cette fiche est déjà signée : elle ne peut plus être modifiée." }, { status: 422 });
  }

  if (parsed.data.signatureId) {
    const signature = await prisma.signature.findUnique({ where: { id: parsed.data.signatureId } });
    if (!signature || signature.documentType !== "FICHE_TECHNIQUE_SOUDAGE" || signature.documentId !== params.id) {
      return NextResponse.json({ error: "Signature introuvable ou ne correspond pas à cette fiche." }, { status: 422 });
    }
  }

  const fiche = existante
    ? await prisma.ficheTechniqueSoudage.update({ where: { jointId: params.id }, data: parsed.data })
    : await prisma.ficheTechniqueSoudage.create({ data: { jointId: params.id, ...parsed.data } });

  return NextResponse.json(fiche);
}
