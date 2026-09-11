import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateMatierePrevueSchema = z.object({
  affaireId: z.string().min(1),
  designation: z.string().min(1),
  normeProduit: z.string().min(1),
  nuance: z.string().min(1),
  diametre: z.number().optional(),
  epaisseur: z.number().optional(),
  quantitePrevue: z.string().optional(),
});

// GET /api/matieres-prevues?affaireId=...
// Ce qui est commandé/prévu pour l'affaire (voir MatierePrevue dans
// schema.prisma), saisi une seule fois puis comparé automatiquement à
// chaque matière réceptionnée (voir POST /api/matieres et
// src/lib/conformiteMatiere.ts).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const prevues = await prisma.matierePrevue.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(prevues);
}

// POST /api/matieres-prevues — déclare ce qui est prévu pour l'affaire,
// niveau 2 minimum (même niveau que la réception d'une matière).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateMatierePrevueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const prevue = await prisma.matierePrevue.create({ data: parsed.data });
  return NextResponse.json(prevue, { status: 201 });
}
