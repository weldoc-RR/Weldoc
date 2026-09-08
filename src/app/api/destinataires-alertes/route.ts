import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateDestinataireSchema = z.object({
  email: z.string().email(),
});

// GET /api/destinataires-alertes — adresses qui reçoivent le récapitulatif
// hebdomadaire des alertes (chaque lundi).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const destinataires = await prisma.destinataireAlerte.findMany({ orderBy: { email: "asc" } });
  return NextResponse.json(destinataires);
}

// POST /api/destinataires-alertes — ajoute une adresse destinataire
// (niveau 2 minimum). Si l'adresse existe déjà mais était désactivée, elle
// est réactivée plutôt que dupliquée.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateDestinataireSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existant = await prisma.destinataireAlerte.findUnique({ where: { email: parsed.data.email } });
  if (existant) {
    const destinataire = existant.actif
      ? existant
      : await prisma.destinataireAlerte.update({ where: { id: existant.id }, data: { actif: true } });
    return NextResponse.json(destinataire);
  }

  const destinataire = await prisma.destinataireAlerte.create({ data: { email: parsed.data.email } });
  return NextResponse.json(destinataire, { status: 201 });
}
