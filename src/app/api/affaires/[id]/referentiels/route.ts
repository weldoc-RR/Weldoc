import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

// GET /api/affaires/[id]/referentiels — référentiels applicables à cette
// affaire (voir AffaireReferentiel dans schema.prisma).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const liens = await prisma.affaireReferentiel.findMany({
    where: { affaireId: params.id },
    include: { referentiel: true },
  });
  return NextResponse.json(liens.map((l) => l.referentiel));
}

const LierSchema = z.object({ referentielId: z.string().min(1) });

// POST /api/affaires/[id]/referentiels — lie un référentiel déjà
// enregistré (voir POST /api/referentiels) à cette affaire, niveau 2
// minimum. Sans effet si le lien existe déjà.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = LierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [affaire, referentiel] = await Promise.all([
    prisma.affaire.findUnique({ where: { id: params.id } }),
    prisma.referentiel.findUnique({ where: { id: parsed.data.referentielId } }),
  ]);
  if (!affaire) return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  if (!referentiel) return NextResponse.json({ error: "Référentiel introuvable." }, { status: 404 });

  const existant = await prisma.affaireReferentiel.findUnique({
    where: { affaireId_referentielId: { affaireId: params.id, referentielId: parsed.data.referentielId } },
  });
  if (existant) return NextResponse.json(referentiel);

  await prisma.affaireReferentiel.create({ data: { affaireId: params.id, referentielId: parsed.data.referentielId } });
  return NextResponse.json(referentiel, { status: 201 });
}

// DELETE /api/affaires/[id]/referentiels?referentielId=... — délie un
// référentiel de cette affaire (le référentiel lui-même n'est jamais
// supprimé, seul le lien l'est), niveau 2 minimum.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const referentielId = req.nextUrl.searchParams.get("referentielId");
  if (!referentielId) {
    return NextResponse.json({ error: "referentielId requis." }, { status: 400 });
  }

  await prisma.affaireReferentiel.deleteMany({ where: { affaireId: params.id, referentielId } });
  return NextResponse.json({ ok: true });
}
