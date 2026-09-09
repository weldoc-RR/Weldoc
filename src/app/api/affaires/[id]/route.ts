import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const UpdateSchema = z.object({
  nombreJointsPrevus: z.number().int().nonnegative().nullable(),
});

// PATCH /api/affaires/[id] — pour l'instant, uniquement le nombre de
// joints prévus (voir le cahier des charges, avancement joint par joint :
// "38 joints soudés sur 120 prévus" — src/lib/avancement.ts). Simple
// champ éditable, comme les autres informations générales de l'affaire :
// pas une décision réglementaire, pas de contrôle de niveau ni d'audit
// trail dédié.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const misAJour = await prisma.affaire.update({
    where: { id: params.id },
    data: { nombreJointsPrevus: parsed.data.nombreJointsPrevus },
  });

  return NextResponse.json(misAJour);
}
