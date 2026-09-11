import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

const CreateFormationSchema = z.object({
  personnelId: z.string().min(1),
  intitule: z.string().min(1),
  organisme: z.string().optional(),
  dateRealisation: z.string().datetime(),
  dateExpiration: z.string().datetime().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/formations?personnelId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const formations = await prisma.formation.findMany({
    where: { personnelId: personnelId ?? undefined },
    orderBy: { dateRealisation: "desc" },
  });

  return NextResponse.json(
    formations.map((f) => ({
      ...f,
      statutCalcule: calculerStatut(f.dateExpiration, { suspendu: f.statut === "SUSPENDU" }),
    }))
  );
}

// POST /api/formations — enregistre une formation suivie. Un recyclage se
// traduit par un nouvel enregistrement, jamais par une modification de
// l'ancien.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateFormationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateRealisation, dateExpiration, ...reste } = parsed.data;

  const formation = await prisma.formation.create({
    data: {
      ...reste,
      dateRealisation: new Date(dateRealisation),
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
    },
  });

  return NextResponse.json(formation, { status: 201 });
}
