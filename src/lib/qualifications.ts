import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";

// Quand un soudeur réalise un joint, on vérifie si cela peut constituer une
// preuve pour le maintien de l'une de ses qualifications soudage proche de
// l'échéance, comme demandé au cahier des charges. On se contente de le
// PROPOSER (RECONDUCTION_PROPOSEE) : Weldoc ne décide jamais seul qu'une
// qualification est reconduite, la validation reste faite par une personne
// de niveau 3 habilitée (voir POST /api/qualifications/[id]/evenements).
//
// Limite assumée pour cette première version : on ne vérifie que
// l'échéance, pas encore la correspondance fine procédé/matériaux/diamètre
// du joint avec le domaine de validité de la qualification (le modèle
// Joint n'a pas encore de champ "procédé" structuré). Chaque proposition
// reste donc à vérifier par la personne qui valide, jamais appliquée
// automatiquement.
export async function detecterPreuvesReconduction(soudeurId: string, jointId: string): Promise<void> {
  const qualifications = await prisma.qualification.findMany({
    where: { personnelId: soudeurId, type: "SOUDAGE" },
    include: { evenements: { orderBy: { date: "desc" }, take: 1 } },
  });

  for (const qualification of qualifications) {
    const dejaProposee = qualification.evenements[0]?.type === "RECONDUCTION_PROPOSEE";
    if (dejaProposee) continue;

    const statut = calculerStatut(qualification.dateExpiration, {
      suspendu: qualification.statut === "SUSPENDU",
    });
    if (statut !== "BIENTOT_ECHEANCE") continue;

    await prisma.qualificationEvenement.create({
      data: {
        qualificationId: qualification.id,
        type: "RECONDUCTION_PROPOSEE",
        preuveJointIds: [jointId],
        commentaire:
          "Proposition automatique : qualification proche de l'échéance et activité de soudage détectée. " +
          "À vérifier par une personne habilitée avant validation (correspondance procédé/matériaux non vérifiée automatiquement).",
      },
    });
  }
}
