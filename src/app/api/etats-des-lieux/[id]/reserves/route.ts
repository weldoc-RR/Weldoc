import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  description: z.string().min(1),
  transmiseAuClient: z.boolean().optional(),
});

// POST /api/etats-des-lieux/[id]/reserves — ajoute une réserve à un
// constat (cahier des charges : "en cas de problème : réserve..."). Un
// problème plus grave se déclare comme FNC via le module FNC déjà
// existant, en la reliant à la même affaire. Refusé une fois le constat
// signé (même règle que sa modification directe).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const etatDesLieux = await prisma.etatDesLieux.findUnique({ where: { id: params.id } });
  if (!etatDesLieux) {
    return NextResponse.json({ error: "Constat introuvable." }, { status: 404 });
  }
  if (etatDesLieux.signatureId) {
    return NextResponse.json({ error: "Ce constat est déjà signé : impossible d'y ajouter une réserve." }, { status: 422 });
  }

  const reserve = await prisma.reserveConstat.create({
    data: { etatDesLieuxId: params.id, description: parsed.data.description, transmiseAuClient: parsed.data.transmiseAuClient ?? false },
  });

  return NextResponse.json(reserve, { status: 201 });
}
