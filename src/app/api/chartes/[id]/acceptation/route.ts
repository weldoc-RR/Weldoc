import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/chartes/[id]/acceptation — la personne connectée accepte cette
// version de la charte. Nécessaire avant de pouvoir signer un document
// (voir POST /api/signatures) ; à refaire à chaque nouvelle version.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const charte = await prisma.chartVersion.findUnique({ where: { id: params.id } });
  if (!charte) {
    return NextResponse.json({ error: "Version de charte introuvable." }, { status: 404 });
  }

  const existante = await prisma.chartAcceptation.findUnique({
    where: { personnelId_chartVersionId: { personnelId: auth.utilisateur.personnelId, chartVersionId: params.id } },
  });
  const acceptation =
    existante ??
    (await prisma.chartAcceptation.create({
      data: { personnelId: auth.utilisateur.personnelId, chartVersionId: params.id },
    }));

  return NextResponse.json(acceptation, { status: existante ? 200 : 201 });
}
