import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";

const CreateProcedureInterneSchema = z.object({
  reference: z.string().min(1),
  version: z.string().optional(),
  titre: z.string().min(1),
  type: z.string().optional(),
  documentUrl: z.string().optional(),
  dateEmission: z.string().datetime(),
});

// GET /api/procedures-internes — bibliothèque des procédures/instructions/
// formulaires/PV/fiches techniques internes (voir le cahier des charges,
// "DOCUMENTATION ET PROCÉDURES INTERNES"), statut "en vigueur/ancienne
// version/retirée" recalculé à la lecture (voir src/lib/procedures.ts),
// même principe que WPS/QMOS : une révision n'est jamais écrasée.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const procedures = await prisma.procedureInterne.findMany({
    orderBy: [{ reference: "asc" }, { dateEmission: "desc" }],
  });
  return NextResponse.json(annoterStatutProcedures(procedures, (p) => p.dateEmission));
}

// POST /api/procedures-internes — enregistre une nouvelle procédure (ou une
// nouvelle révision : même référence, version différente), niveau 2
// minimum.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateProcedureInterneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateEmission, ...reste } = parsed.data;

  const procedure = await prisma.procedureInterne.create({
    data: { ...reste, dateEmission: new Date(dateEmission) },
  });
  return NextResponse.json(procedure, { status: 201 });
}

const RetirerProcedureInterneSchema = z.object({
  id: z.string().min(1),
  retiree: z.boolean(),
});

// PATCH /api/procedures-internes — marque une révision comme retirée ou la
// réactive ; ne modifie jamais son contenu.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = RetirerProcedureInterneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const procedure = await prisma.procedureInterne.update({
    where: { id: parsed.data.id },
    data: { retiree: parsed.data.retiree },
  });
  return NextResponse.json(procedure);
}
