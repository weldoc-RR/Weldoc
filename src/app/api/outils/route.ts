import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";

const CreateOutilSchema = z.object({
  reference: z.string().min(1),
  type: z.string().min(1),
  fabricant: z.string().optional(),
  numeroSerie: z.string().optional(),
  dateVerification: z.string().datetime().optional(),
  dateEcheance: z.string().datetime().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/outils?type=... — fiche outillage/métrologie, avec le statut
// recalculé en direct à partir de la date d'échéance (voir GET par QR
// ci-dessous pour la recherche depuis un scan).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const type = req.nextUrl.searchParams.get("type");
  const outils = await prisma.outil.findMany({
    where: { type: type ?? undefined },
    orderBy: { reference: "asc" },
  });

  return NextResponse.json(
    outils.map((o) => ({
      ...o,
      statutCalcule: calculerStatutOutil(o.dateEcheance, { horsService: o.statut === "HORS_SERVICE" }),
    }))
  );
}

// POST /api/outils — enregistre un outil de métrologie/outillage, avec un
// QR code généré automatiquement pour l'identification rapide sur le
// terrain (niveau 2 minimum).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateOutilSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateVerification, dateEcheance, ...reste } = parsed.data;

  const outil = await prisma.outil.create({
    data: {
      ...reste,
      dateVerification: dateVerification ? new Date(dateVerification) : undefined,
      dateEcheance: dateEcheance ? new Date(dateEcheance) : undefined,
      qrCodeValeur: `OUTIL-${randomBytes(16).toString("hex")}`,
    },
  });

  return NextResponse.json(outil, { status: 201 });
}
