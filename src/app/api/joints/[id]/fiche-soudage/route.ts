import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/joints/[id]/fiche-soudage — la fiche technique de suivi de
// soudage qui couvre ce joint, avec la liste complète des joints
// qu'elle couvre (elle peut en couvrir plusieurs à la fois, voir
// POST/PATCH /api/fiches-soudage — "saisie groupée"). `null` si ce joint
// n'a pas encore de fiche. La création et la modification se font
// désormais via /api/fiches-soudage, pas ici : une fiche n'appartient
// plus à un seul joint, donc ce n'est plus la bonne route pour l'écrire.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const joint = await prisma.joint.findUnique({
    where: { id: params.id },
    select: {
      ficheSoudage: {
        include: { joints: { select: { id: true, numero: true, indiceReparation: true, affaireId: true } } },
      },
    },
  });
  return NextResponse.json(joint?.ficheSoudage ?? null);
}
