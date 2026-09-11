import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";

const CreateQmosSchema = z.object({
  reference: z.string().min(1),
  version: z.string().optional(),
  procede: z.string().min(1),
  normeReference: z.string().min(1),
  laboratoire: z.string().optional(),
  dateEssai: z.string().datetime().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/qmos — bibliothèque des QMOS (qualifications de mode opératoire
// de soudage), statut "en vigueur/ancienne version/retirée" recalculé à la
// lecture (voir src/lib/procedures.ts) : une révision n'est jamais écrasée.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const qmos = await prisma.qmos.findMany({ orderBy: [{ reference: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(
    annoterStatutProcedures(qmos, (q) => q.dateEssai ?? q.createdAt)
  );
}

// POST /api/qmos — enregistre une nouvelle QMOS (ou une nouvelle révision
// d'une QMOS existante : même référence, version différente), niveau 2
// minimum. Rien n'est jamais écrasé : une nouvelle révision est un nouvel
// enregistrement.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateQmosSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateEssai, ...reste } = parsed.data;

  const qmos = await prisma.qmos.create({
    data: { ...reste, dateEssai: dateEssai ? new Date(dateEssai) : undefined },
  });
  return NextResponse.json(qmos, { status: 201 });
}

const RetirerQmosSchema = z.object({
  id: z.string().min(1),
  retiree: z.boolean(),
});

// PATCH /api/qmos — marque une révision comme retirée (ex. norme devenue
// obsolète) ou la réactive ; ne modifie jamais son contenu.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = RetirerQmosSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const qmos = await prisma.qmos.update({ where: { id: parsed.data.id }, data: { retiree: parsed.data.retiree } });
  return NextResponse.json(qmos);
}
