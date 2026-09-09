import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";
import { tracerModification } from "@/lib/auditTrail";

const DecisionSchema = z.object({
  statut: z.enum(["ACCEPTEE", "REFUSEE", "MODIFICATION_DEMANDEE"]),
  commentaireDecision: z.string().optional(),
  conditions: z.string().optional(),
});

// POST /api/demandes-sequencement/[id]/decision — accepte, refuse, ou
// demande une modification de la demande, avec conditions éventuelles.
// Réservé au niveau 3 ; la décision est identifiée, datée et historisée
// (jamais prise automatiquement), comme demandé au cahier des charges.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const demande = await prisma.demandeModificationSequencement.findUnique({ where: { id: params.id } });
  if (!demande) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  const miseAJour = await prisma.demandeModificationSequencement.update({
    where: { id: params.id },
    data: {
      statut: parsed.data.statut,
      commentaireDecision: parsed.data.commentaireDecision,
      conditions: parsed.data.conditions,
      decisionParId: droits.utilisateur.personnelId,
      dateDecision: new Date(),
    },
  });

  await tracerModification({
    utilisateurId: droits.utilisateur.personnelId,
    entite: "DemandeModificationSequencement",
    entiteId: demande.id,
    ancienneValeur: { statut: demande.statut },
    nouvelleValeur: { statut: miseAJour.statut, conditions: miseAJour.conditions },
  });

  return NextResponse.json(miseAJour);
}
