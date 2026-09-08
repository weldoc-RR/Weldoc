import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatutOutil, calculerDateEcheance } from "@/lib/statutOutil";

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
  const dateVerificationDate = dateVerification ? new Date(dateVerification) : undefined;

  // Si l'échéance n'est pas saisie explicitement, elle est déduite de la
  // date de vérification : un an par défaut, sauf exceptions déclarées par
  // type d'outil (voir src/lib/statutOutil.ts — pour l'instant : pince
  // ampèremétrique, 6 mois).
  const dateEcheanceDate = dateEcheance
    ? new Date(dateEcheance)
    : dateVerificationDate
      ? calculerDateEcheance(reste.type, dateVerificationDate)
      : undefined;

  const outil = await prisma.outil.create({
    data: {
      ...reste,
      dateVerification: dateVerificationDate,
      dateEcheance: dateEcheanceDate,
      qrCodeValeur: `OUTIL-${randomBytes(16).toString("hex")}`,
    },
  });

  return NextResponse.json(outil, { status: 201 });
}

const UpdateVerificationSchema = z.object({
  id: z.string().min(1),
  dateVerification: z.string().datetime(),
  dateEcheance: z.string().datetime().optional(),
  statut: z.enum(["VALIDE", "EXPIRE", "HORS_SERVICE"]).optional(),
});

// PATCH /api/outils — enregistre une nouvelle vérification de l'outil et
// recalcule son échéance selon la même règle qu'à la création (un an, sauf
// exceptions par type), sauf si une échéance est saisie explicitement.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = UpdateVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, dateVerification, dateEcheance, statut } = parsed.data;

  const outilExistant = await prisma.outil.findUnique({ where: { id } });
  if (!outilExistant) {
    return NextResponse.json({ error: "Outil introuvable." }, { status: 404 });
  }

  const dateVerificationDate = new Date(dateVerification);
  const dateEcheanceDate = dateEcheance
    ? new Date(dateEcheance)
    : calculerDateEcheance(outilExistant.type, dateVerificationDate);

  const outil = await prisma.outil.update({
    where: { id },
    data: { dateVerification: dateVerificationDate, dateEcheance: dateEcheanceDate, statut },
  });

  return NextResponse.json(outil);
}
