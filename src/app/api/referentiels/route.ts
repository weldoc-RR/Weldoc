import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateReferentielSchema = z.object({
  code: z.string().min(1),
  domaine: z.string().min(1),
  version: z.string().optional(),
});

// GET /api/referentiels — bibliothèque des référentiels (codes de norme,
// ex. "EN ISO 9606-1", "EN 13480") utilisés par l'entreprise, à lier à
// une affaire (voir GET/POST /api/affaires/[id]/referentiels), une
// qualification (`Qualification.referentielId`) ou un produit
// dimensionnel (`ProduitDimensionnel.referentielId`).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const referentiels = await prisma.referentiel.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(referentiels);
}

// POST /api/referentiels — enregistre un référentiel, niveau 2 minimum.
// `code` est unique : un référentiel déjà enregistré ne se recrée pas,
// il se choisit ensuite dans les listes déroulantes concernées.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateReferentielSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existant = await prisma.referentiel.findUnique({ where: { code: parsed.data.code } });
  if (existant) {
    return NextResponse.json({ error: `Le référentiel "${parsed.data.code}" existe déjà.` }, { status: 409 });
  }

  const referentiel = await prisma.referentiel.create({ data: parsed.data });
  return NextResponse.json(referentiel, { status: 201 });
}
