import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";

const PasseSchema = z.object({
  ordre: z.number().int().positive(),
  procede: z.string().min(1),
  modeOperatoire: z.string().optional(),
  position: z.string().optional(),
  metalApportType: z.string().optional(),
  metalApportDesignationNormalisee: z.string().optional(),
  metalApportDesignationCommerciale: z.string().optional(),
  metalApportDiametreMm: z.number().optional(),
  gazEndroitNature: z.string().optional(),
  gazEndroitDebit: z.string().optional(),
  gazEnversNature: z.string().optional(),
  gazEnversDebit: z.string().optional(),
  natureCourantPolarite: z.string().optional(),
  intensiteAMin: z.number().optional(),
  intensiteAMax: z.number().optional(),
  tensionVMin: z.number().optional(),
  tensionVMax: z.number().optional(),
  temperatureMiniPieceC: z.number().optional(),
  temperatureMaxiEntrePassesC: z.number().optional(),
  observations: z.string().optional(),
});

const CreateWpsSchema = z.object({
  reference: z.string().min(1),
  version: z.string().optional(),
  typeAssemblage: z.enum(["BOUT_A_BOUT", "ANGLE", "EMMANCHE_SOUDE", "RECHARGEMENT", "AUTRE"]).optional(),
  procede: z.string().min(1),
  normeReference: z.string().min(1),
  materiaux: z.string().optional(),
  groupeMateriaux: z.string().optional(),
  epaisseurMinMm: z.number().optional(),
  epaisseurMaxMm: z.number().optional(),
  diametreMinMm: z.number().optional(),
  diametreMaxMm: z.number().optional(),
  positions: z.string().optional(),
  preparationNotes: z.string().optional(),
  qmosId: z.string().optional(),
  documentUrl: z.string().optional(),
  dateEmission: z.string().datetime(),
  // Temps théorique de référence (voir le cahier des charges, "TEMPS ET
  // PRODUCTIVITÉ"), en minutes — barème propre à l'entreprise.
  tempsTheoriqueMin: z.number().optional(),
  // Détail passe par passe, créé avec le WPS (voir la remarque sur les
  // transactions dans src/lib/prisma.ts : écritures séquentielles, jamais
  // imbriquées).
  passes: z.array(PasseSchema).optional(),
});

// GET /api/wps — bibliothèque des WPS/DMOS, statut "en vigueur/ancienne
// version/retirée" recalculé à la lecture (voir src/lib/procedures.ts) :
// une révision n'est jamais écrasée.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const wps = await prisma.wps.findMany({
    include: {
      qmos: { select: { reference: true, version: true } },
      passes: { orderBy: { ordre: "asc" } },
    },
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
  const { dateEmission, qmosId, passes, ...reste } = parsed.data;

  if (qmosId) {
    const qmos = await prisma.qmos.findUnique({ where: { id: qmosId } });
    if (!qmos) {
      return NextResponse.json({ error: "QMOS introuvable." }, { status: 422 });
    }
  }

  const wps = await prisma.wps.create({
    data: { ...reste, qmosId, dateEmission: new Date(dateEmission) },
  });

  for (const passe of passes ?? []) {
    await prisma.wpsPasse.create({ data: { ...passe, wpsId: wps.id } });
  }

  const wpsAvecPasses = await prisma.wps.findUniqueOrThrow({
    where: { id: wps.id },
    include: { passes: { orderBy: { ordre: "asc" } } },
  });
  return NextResponse.json(wpsAvecPasses, { status: 201 });
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
