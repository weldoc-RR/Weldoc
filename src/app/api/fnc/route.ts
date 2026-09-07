import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// GET /api/fnc?affaireId=... — liste les FNC (optionnellement filtrées par affaire)
export async function GET(req: NextRequest) {
  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const fncs = await prisma.fNC.findMany({
    where: affaireId ? { affaireId } : undefined,
    include: { joint: true },
    orderBy: { dateCreation: "desc" },
  });
  return NextResponse.json(fncs);
}

const UpdateFNCSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["DETECTION", "ANALYSE", "ACTION_CORRECTIVE", "CONTROLE", "VALIDATION", "CLOTUREE"]).optional(),
  actionCorrective: z.string().optional(),
  valideeParId: z.string().optional(), // doit être une personne de niveau habilité — vérification des droits à ajouter
});

// PATCH /api/fnc — fait avancer le workflow d'une FNC (détection → ... → clôture)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = UpdateFNCSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  const fnc = await prisma.fNC.update({
    where: { id },
    data: {
      ...updates,
      dateCloture: updates.statut === "CLOTUREE" ? new Date() : undefined,
    },
  });

  return NextResponse.json(fnc);
}
