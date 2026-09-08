import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const ValiderSchema = z.object({ signatureId: z.string().min(1) });

// GET /api/affaires/[id]/rapport-fin-fabrication — dernière validation
// enregistrée pour cette affaire (aucun nouvel enregistrement dédié : la
// signature elle-même, voir POST /api/signatures, EST la trace), ou null
// si le rapport n'a encore jamais été validé.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const validation = await prisma.signature.findFirst({
    where: { documentType: "RAPPORT_FIN_FABRICATION", documentId: params.id },
    orderBy: { dateSignature: "desc" },
    include: { personnel: { select: { nom: true, prenom: true } } },
  });
  return NextResponse.json(validation);
}

// POST /api/affaires/[id]/rapport-fin-fabrication — valide le rapport de
// fin de fabrication (voir cahier des charges, "signé par une personne
// habilitée") : réservé au niveau 3, et exige une signature déjà créée
// (POST /api/signatures, documentType "RAPPORT_FIN_FABRICATION") pour ce
// rapport précis. Weldoc ne se substitue jamais à cette décision humaine
// et tracée, ni à un organisme réglementaire ou une certification externe.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = ValiderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const signature = await prisma.signature.findUnique({
    where: { id: parsed.data.signatureId },
    include: { personnel: { select: { nom: true, prenom: true } } },
  });
  if (!signature || signature.documentType !== "RAPPORT_FIN_FABRICATION" || signature.documentId !== params.id) {
    return NextResponse.json({ error: "Signature introuvable ou ne correspond pas à ce rapport." }, { status: 422 });
  }

  return NextResponse.json({ ok: true, validation: signature });
}
