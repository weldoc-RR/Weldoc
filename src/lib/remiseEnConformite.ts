import { prisma } from "@/lib/prisma";

// Après un contrôle conforme sur un joint de réparation, on fait avancer
// automatiquement la FNC que ce joint résout — de ACTION_CORRECTIVE à
// CONTROLE — sans jamais aller plus loin : la validation et la clôture
// restent une décision humaine de niveau 3 (voir PATCH /api/fnc), Weldoc ne
// fait que constater qu'un contrôle vient d'être réalisé avec succès.
export async function avancerFNCApresControleConforme(jointId: string): Promise<void> {
  const fnc = await prisma.fNC.findFirst({
    where: { actionCorrectiveJointId: jointId, statut: "ACTION_CORRECTIVE" },
  });
  if (!fnc) return;

  await prisma.fNC.update({ where: { id: fnc.id }, data: { statut: "CONTROLE" } });
}

// Traitement d'une FNC au sens du RFI (voir le modèle réel : "Accepté /
// Remplacé / Réparé") : pas un champ à part, déduit de ce qui existe déjà
// — le type d'action du joint de réparation qui la résout, ou "Accepté"
// pour une FNC clôturée sans réparation (acceptée en l'état). Encore
// ouverte, aucun traitement n'est déterminé.
export type TraitementFNC = "ACCEPTE" | "REMPLACE" | "REPARE" | null;

export function traitementFNC(fnc: {
  statut: string;
  actionCorrectiveJointId: string | null;
  actionCorrectiveJointTypeAction?: string | null;
}): TraitementFNC {
  if (fnc.actionCorrectiveJointId && fnc.actionCorrectiveJointTypeAction) {
    return fnc.actionCorrectiveJointTypeAction === "REMPLACEMENT" ? "REMPLACE" : "REPARE";
  }
  if (fnc.statut === "CLOTUREE") return "ACCEPTE";
  return null;
}
