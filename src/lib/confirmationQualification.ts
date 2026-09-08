// Certains référentiels exigent, en plus de l'échéance finale d'une
// qualification, des confirmations périodiques (ex. tous les 6 mois) pour
// qu'elle reste valable — distinct d'une reconduction/prolongation
// complète (voir RECONDUCTION_PROPOSEE/VALIDEE). La périodicité
// (`frequenceConfirmationMois`) est propre à chaque qualification, jamais
// imposée par Weldoc. Comme calculerStatut/calculerStatutOutil, la
// prochaine échéance de confirmation est recalculée à la lecture, jamais
// stockée : elle part de la dernière confirmation enregistrée (ou de la
// date d'obtention s'il n'y en a pas encore eu).
export const SEUIL_BIENTOT_CONFIRMATION_JOURS = 30;

export interface InfoConfirmation {
  // null si aucune confirmation périodique n'est exigée pour cette
  // qualification (frequenceConfirmationMois non renseigné).
  prochaineDateDue: Date | null;
  enRetard: boolean;
  bientotDue: boolean;
}

export function calculerProchaineConfirmation(
  frequenceConfirmationMois: number | null,
  dateObtention: Date,
  datesConfirmationsAnterieures: Date[],
  options: { aujourdHui?: Date } = {}
): InfoConfirmation {
  if (!frequenceConfirmationMois) {
    return { prochaineDateDue: null, enRetard: false, bientotDue: false };
  }

  const derniereDate =
    datesConfirmationsAnterieures.length > 0
      ? new Date(Math.max(...datesConfirmationsAnterieures.map((d) => d.getTime())))
      : dateObtention;

  const prochaineDateDue = new Date(derniereDate);
  prochaineDateDue.setMonth(prochaineDateDue.getMonth() + frequenceConfirmationMois);

  const aujourdHui = options.aujourdHui ?? new Date();
  const joursRestants = Math.ceil((prochaineDateDue.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24));

  return {
    prochaineDateDue,
    enRetard: joursRestants < 0,
    bientotDue: joursRestants >= 0 && joursRestants <= SEUIL_BIENTOT_CONFIRMATION_JOURS,
  };
}
