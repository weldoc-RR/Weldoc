import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  intervenant: z.string().min(1),
  description: z.string().min(1),
  ordre: z.number().int().optional(),
});

// GET /api/perimetres-travaux?affaireId=... — qui a la charge de quels
// travaux (voir "Travaux réalisés" du modèle réel : "à la charge ULM",
// "à la charge des prestataires"...), texte libre.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const perimetres = await prisma.perimetreTravaux.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { ordre: "asc" },
  });
  return NextResponse.json(perimetres);
}

// POST /api/perimetres-travaux
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

  const perimetre = await prisma.perimetreTravaux.create({ data: parsed.data });
  return NextResponse.json(perimetre, { status: 201 });
}
