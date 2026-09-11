import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreatePieceSchema = z.object({
  affaireId: z.string().min(1),
  reference: z.string().min(1),
  designation: z.string().optional(),
  photosUrls: z.array(z.string()).optional(),
});

// GET /api/pieces?affaireId=... — pièces prises en charge, avec leur statut.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const pieces = await prisma.piece.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { datePriseEnCharge: "desc" },
  });
  return NextResponse.json(pieces);
}

// POST /api/pieces — prise en charge d'une pièce (atelier) : référence,
// éventuellement des photos comme preuve des repères présents dessus. Une
// pièce peut être ajoutée à tout moment (au fil de l'eau), pas seulement
// planifiée à l'avance comme les joints d'un chantier — accessible à toute
// personne authentifiée, comme les autres actions de terrain.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreatePieceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const piece = await prisma.piece.create({
      data: { ...parsed.data, priseEnChargeParId: auth.utilisateur.personnelId },
    });
    return NextResponse.json(piece, { status: 201 });
  } catch (e) {
    // Contrainte d'unicité (affaireId, reference) : le pilote HTTP remonte
    // le code Postgres brut (23505) plutôt que l'erreur Prisma habituelle
    // (P2002) — on gère les deux pour rester robuste aux deux formes.
    const code = (e as { code?: string }).code;
    if (code === "23505" || code === "P2002") {
      return NextResponse.json(
        { error: "Cette référence est déjà utilisée pour cette affaire." },
        { status: 409 }
      );
    }
    throw e;
  }
}

const UpdatePieceSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["PRISE_EN_CHARGE", "EN_FABRICATION", "TERMINEE", "EXPEDIEE"]),
});

// PATCH /api/pieces — fait avancer le statut d'une pièce au fil de la
// fabrication (suivi de traçabilité "tout au long de l'activité").
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = UpdatePieceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const piece = await prisma.piece.update({
    where: { id: parsed.data.id },
    data: { statut: parsed.data.statut },
  });

  return NextResponse.json(piece);
}
