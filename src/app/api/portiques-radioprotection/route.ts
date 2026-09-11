import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  categorie: z.string().min(1),
  nombre: z.number().int(),
  localisation: z.string().optional(),
  observations: z.string().optional(),
});

// GET /api/portiques-radioprotection?affaireId=... — relevés des portiques
// de contrôle radiologique (voir "Bilan radioprotection" du modèle réel).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const portiques = await prisma.portiqueRadioprotection.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { categorie: "asc" },
  });
  return NextResponse.json(portiques);
}

// POST /api/portiques-radioprotection
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: parsed.data.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const portique = await prisma.portiqueRadioprotection.create({ data: parsed.data });
  return NextResponse.json(portique, { status: 201 });
}
