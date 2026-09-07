import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateAffaireSchema = z.object({
  numero: z.string().min(1),
  client: z.string().min(1),
  projet: z.string().min(1),
  chantier: z.string().min(1),
  site: z.string().min(1),
  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),
});

// GET /api/affaires — liste toutes les affaires
export async function GET() {
  const affaires = await prisma.affaire.findMany({
    orderBy: { createdAt: "desc" },
    include: { joints: true, fncs: true },
  });
  return NextResponse.json(affaires);
}

// POST /api/affaires — crée une nouvelle affaire (le "conteneur" principal)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateAffaireSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.create({
    data: {
      ...parsed.data,
      dateDebut: parsed.data.dateDebut ? new Date(parsed.data.dateDebut) : undefined,
      dateFin: parsed.data.dateFin ? new Date(parsed.data.dateFin) : undefined,
    },
  });

  return NextResponse.json(affaire, { status: 201 });
}
