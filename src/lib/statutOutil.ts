import { SEUIL_BIENTOT_ECHEANCE_JOURS } from "@/lib/statutValidite";

// Distinct du StatutOutil stocké en base (VALIDE/EXPIRE/HORS_SERVICE) : ici
// on ajoute BIENTOT_ECHEANCE, un état purement calculé (jamais stocké) qui
// sert à alerter avant l'échéance plutôt qu'après. Voir GET /api/alertes.
export type StatutAffichageOutil = "VALIDE" | "BIENTOT_ECHEANCE" | "EXPIRE" | "HORS_SERVICE";

// Comme pour calculerStatut (qualifications/habilitations), le statut
// affiché est déduit de la date d'échéance plutôt que d'une valeur stockée
// qui pourrait devenir périmée. HORS_SERVICE reste un état explicite
// (quelqu'un a retiré l'outil du service), qui prime sur le calcul par date.
export function calculerStatutOutil(
  dateEcheance: Date | null,
  options: { horsService?: boolean; aujourdHui?: Date } = {}
): StatutAffichageOutil {
  if (options.horsService) return "HORS_SERVICE";
  if (!dateEcheance) return "VALIDE";

  const aujourdHui = options.aujourdHui ?? new Date();
  const joursRestants = Math.ceil((dateEcheance.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24));

  if (joursRestants < 0) return "EXPIRE";
  if (joursRestants <= SEUIL_BIENTOT_ECHEANCE_JOURS) return "BIENTOT_ECHEANCE";
  return "VALIDE";
}

// Un outil ne peut plus être utilisé pour un contrôle que s'il est
// VALIDE ou BIENTOT_ECHEANCE (encore dans les temps) : EXPIRE et
// HORS_SERVICE bloquent (voir POST /api/controles-dimensionnels).
export function outilUtilisable(statut: StatutAffichageOutil): boolean {
  return statut === "VALIDE" || statut === "BIENTOT_ECHEANCE";
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
