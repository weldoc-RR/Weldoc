import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";

// DELETE /api/destinataires-alertes/[id] — désactive une adresse (ne
// reçoit plus le récapitulatif). On désactive plutôt que supprimer, pour
// garder une trace de qui a reçu quoi par le passé.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const destinataire = await prisma.destinataireAlerte.findUnique({ where: { id: params.id } });
  if (!destinataire) {
    return NextResponse.json({ error: "Destinataire introuvable." }, { status: 404 });
  }

  const misAJour = await prisma.destinataireAlerte.update({ where: { id: params.id }, data: { actif: false } });
  return NextResponse.json(misAJour);
}
