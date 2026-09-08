import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

const CreateAcuiteSchema = z.object({
  personnelId: z.string().min(1),
  dateTest: z.string().datetime(),
  dateExpiration: z.string().datetime().optional(),
  apte: z.boolean(),
  organisme: z.string().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/acuites-visuelles?personnelId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const tests = await prisma.acuiteVisuelle.findMany({
    where: { personnelId: personnelId ?? undefined },
    orderBy: { dateTest: "desc" },
  });

  return NextResponse.json(
    tests.map((t) => ({
      ...t,
      statutCalcule: calculerStatut(t.dateExpiration, { suspendu: t.statut === "SUSPENDU" }),
    }))
  );
}

// POST /api/acuites-visuelles — enregistre un test d'acuité visuelle. Un
// nouveau test est un nouvel enregistrement, jamais une modification du
// précédent.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateAcuiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateTest, dateExpiration, ...reste } = parsed.data;

  const test = await prisma.acuiteVisuelle.create({
    data: {
      ...reste,
      dateTest: new Date(dateTest),
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
    },
  });

  return NextResponse.json(test, { status: 201 });
}
