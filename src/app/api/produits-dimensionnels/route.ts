import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";

const CreateSchema = z.object({
  reference: z.string().min(1),
  version: z.string().optional(),
  designation: z.string().min(1),
  type: z.string().optional(),
  normeProduit: z.string().min(1),
  diametreNominalMm: z.number().optional(),
  epaisseurNominaleMm: z.number().optional(),
  finition: z.string().optional(),
  etat: z.string().optional(),
  classeType: z.string().optional(),
  diametreMiniMm: z.number(),
  diametreMaxiMm: z.number(),
  epaisseurMiniMm: z.number(),
  epaisseurMaxiMm: z.number(),
  referentielId: z.string().optional(),
});

// GET /api/produits-dimensionnels — bibliothèque dimensionnelle (voir le
// cahier des charges, "BIBLIOTHÈQUE DIMENSIONNELLE"), statut "en
// vigueur/ancienne version/retirée" recalculé à la lecture (même
// principe que WPS/QMOS/ProcedureInterne/DocumentExterne).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const produits = await prisma.produitDimensionnel.findMany({
    include: { referentiel: { select: { code: true, domaine: true } } },
    orderBy: [{ reference: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(annoterStatutProcedures(produits, (p) => p.createdAt));
}

// POST /api/produits-dimensionnels — enregistre un produit (ou une
// nouvelle révision : même référence, version différente), niveau 2
// minimum. Les critères min/maxi doivent venir de la norme réelle
// (jamais recalculés par Weldoc) — voir l'avertissement dans
// src/lib/tolerances.ts.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.referentielId) {
    const referentiel = await prisma.referentiel.findUnique({ where: { id: parsed.data.referentielId } });
    if (!referentiel) {
      return NextResponse.json({ error: "Référentiel introuvable." }, { status: 422 });
    }
  }

  const produit = await prisma.produitDimensionnel.create({ data: parsed.data });
  return NextResponse.json(produit, { status: 201 });
}

const RetirerSchema = z.object({
  id: z.string().min(1),
  retiree: z.boolean(),
});

// PATCH /api/produits-dimensionnels — marque un produit comme retiré ou
// le réactive ; ne modifie jamais ses critères.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = RetirerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const produit = await prisma.produitDimensionnel.update({
    where: { id: parsed.data.id },
    data: { retiree: parsed.data.retiree },
  });
  return NextResponse.json(produit);
}
