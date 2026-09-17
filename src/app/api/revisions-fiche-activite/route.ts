import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  indice: z.string().min(1),
  natureEvolution: z.string().min(1),
});

// GET /api/revisions-fiche-activite?affaireId=... — historique des indices
// de la fiche de suivi d'activité (voir le cahier des charges, "FICHE DE
// SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR PHASE"), même principe que
// /api/revisions-rfi pour l'autre document.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const revisions = await prisma.revisionFicheActivite.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(revisions);
}

// POST /api/revisions-fiche-activite — une nouvelle évolution du document,
// jamais une modification de la précédente.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: parsed.data.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const revision = await prisma.revisionFicheActivite.create({ data: parsed.data });
  return NextResponse.json(revision, { status: 201 });
}
