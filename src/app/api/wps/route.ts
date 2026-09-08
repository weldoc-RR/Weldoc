import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";

const CreateWpsSchema = z.object({
  reference: z.string().min(1),
  version: z.string().optional(),
  procede: z.string().min(1),
  normeReference: z.string().min(1),
  materiaux: z.string().optional(),
  groupeMateriaux: z.string().optional(),
  epaisseurMinMm: z.number().optional(),
  epaisseurMaxMm: z.number().optional(),
  diametreMinMm: z.number().optional(),
  diametreMaxMm: z.number().optional(),
  positions: z.string().optional(),
  qmosId: z.string().optional(),
  documentUrl: z.string().optional(),
  dateEmission: z.string().datetime(),
});

// GET /api/wps — bibliothèque des WPS/DMOS, statut "en vigueur/ancienne
// version/retirée" recalculé à la lecture (voir src/lib/procedures.ts) :
// une révision n'est jamais écrasée.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const wps = await prisma.wps.findMany({
    include: { qmos: { select: { reference: true, version: true } } },
    orderBy: [{ reference: "asc" }, { dateEmission: "desc" }],
  });
  return NextResponse.json(annoterStatutProcedures(wps, (w) => w.dateEmission));
}

// POST /api/wps — enregistre un nouveau WPS/DMOS (ou une nouvelle révision
// d'un WPS existant : même référence, version différente), niveau 2
// minimum. Rien n'est jamais écrasé : une nouvelle révision est un nouvel
// enregistrement.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateWpsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateEmission, qmosId, ...reste } = parsed.data;

  if (qmosId) {
    const qmos = await prisma.qmos.findUnique({ where: { id: qmosId } });
    if (!qmos) {
      return NextResponse.json({ error: "QMOS introuvable." }, { status: 422 });
    }
  }

  const wps = await prisma.wps.create({
    data: { ...reste, qmosId, dateEmission: new Date(dateEmission) },
  });
  return NextResponse.json(wps, { status: 201 });
}

const RetirerWpsSchema = z.object({
  id: z.string().min(1),
  retiree: z.boolean(),
});

// PATCH /api/wps — marque une révision comme retirée (ex. norme devenue
// obsolète) ou la réactive ; ne modifie jamais son contenu.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = RetirerWpsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const wps = await prisma.wps.update({ where: { id: parsed.data.id }, data: { retiree: parsed.data.retiree } });
  return NextResponse.json(wps);
}
