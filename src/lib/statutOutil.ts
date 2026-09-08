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
