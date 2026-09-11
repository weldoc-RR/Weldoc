import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateIndisponibiliteSchema = z.object({
  personnelId: z.string().min(1),
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
  motif: z.string().min(1),
});

// GET /api/indisponibilites?personnelId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const indisponibilites = await prisma.indisponibilite.findMany({
    where: { personnelId: personnelId ?? undefined },
    orderBy: { dateDebut: "desc" },
  });
  return NextResponse.json(indisponibilites);
}

// POST /api/indisponibilites — déclare une période d'indisponibilité
// (congé, maladie, formation, autre), utilisée pour détecter les conflits
// avant une affectation.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateIndisponibiliteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateDebut, dateFin, ...reste } = parsed.data;

  if (new Date(dateFin) <= new Date(dateDebut)) {
    return NextResponse.json({ error: "La date de fin doit être après la date de début." }, { status: 400 });
  }

  const indisponibilite = await prisma.indisponibilite.create({
    data: { ...reste, dateDebut: new Date(dateDebut), dateFin: new Date(dateFin) },
  });

  return NextResponse.json(indisponibilite, { status: 201 });
}
