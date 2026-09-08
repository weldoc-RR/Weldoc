import type { StatutOutil } from "@prisma/client";

// Comme pour calculerStatut (qualifications/habilitations), le statut
// affiché est déduit de la date d'échéance plutôt que d'une valeur stockée
// qui pourrait devenir périmée. HORS_SERVICE reste un état explicite
// (quelqu'un a retiré l'outil du service), qui prime sur le calcul par date.
export function calculerStatutOutil(
  dateEcheance: Date | null,
  options: { horsService?: boolean; aujourdHui?: Date } = {}
): StatutOutil {
  if (options.horsService) return "HORS_SERVICE";
  if (!dateEcheance) return "VALIDE";

  const aujourdHui = options.aujourdHui ?? new Date();
  return dateEcheance < aujourdHui ? "EXPIRE" : "VALIDE";
}

// Durée de validité par défaut avant la prochaine vérification, en mois.
// Un an, sauf exceptions déclarées par l'entreprise ci-dessous (comparaison
// sur le type d'outil, insensible à la casse/aux espaces). Ne s'applique
// que si la date d'échéance n'est pas renseignée explicitement : une saisie
// manuelle prime toujours sur ce calcul.
const DUREE_VALIDITE_MOIS_PAR_DEFAUT = 12;
const DUREES_VALIDITE_MOIS_PAR_TYPE: Record<string, number> = {
  "pince ampèremétrique": 6,
};

export function calculerDateEcheance(type: string, dateVerification: Date): Date {
  const typeNormalise = type.trim().toLowerCase();
  const dureeMois = DUREES_VALIDITE_MOIS_PAR_TYPE[typeNormalise] ?? DUREE_VALIDITE_MOIS_PAR_DEFAUT;

  const dateEcheance = new Date(dateVerification);
  dateEcheance.setMonth(dateEcheance.getMonth() + dureeMois);
  return dateEcheance;
}
