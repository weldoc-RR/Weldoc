import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

const CreateHabilitationSchema = z.object({
  personnelId: z.string().min(1),
  intitule: z.string().min(1),
  reference: z.string().optional(),
  dateObtention: z.string().datetime(),
  dateExpiration: z.string().datetime().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/habilitations?personnelId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const habilitations = await prisma.habilitation.findMany({
    where: { personnelId: personnelId ?? undefined },
    orderBy: { dateObtention: "desc" },
  });

  return NextResponse.json(
    habilitations.map((h) => ({
      ...h,
      statutCalcule: calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" }),
    }))
  );
}

// POST /api/habilitations — enregistre une habilitation. Un renouvellement
// se fait en créant un nouvel enregistrement (jamais en modifiant
// l'ancien) : l'historique complet reste visible via GET.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateHabilitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateObtention, dateExpiration, ...reste } = parsed.data;

  const habilitation = await prisma.habilitation.create({
    data: {
      ...reste,
      dateObtention: new Date(dateObtention),
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
    },
  });

  return NextResponse.json(habilitation, { status: 201 });
}
