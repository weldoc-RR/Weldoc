import type { StatutValidite } from "@prisma/client";

// Nombre de jours avant échéance à partir duquel on affiche "bientôt à
// échéance" plutôt que "valide". Valeur par défaut raisonnable ; à ajuster
// si l'entreprise a une règle différente selon le type d'habilitation.
export const SEUIL_BIENTOT_ECHEANCE_JOURS = 60;

// Calcule le statut affiché à partir des dates, indépendamment de toute
// valeur stockée en base : la date d'expiration reste la seule source de
// vérité pour "valide / bientôt à échéance / expiré". La suspension, elle,
// est un événement explicite (quelqu'un a suspendu la qualification) qui ne
// se déduit pas d'une date : on la passe donc en paramètre et elle prend le
// pas sur le calcul par dates.
export function calculerStatut(
  dateExpiration: Date | null,
  options: { suspendu?: boolean; aujourdHui?: Date } = {}
): StatutValidite {
  if (options.suspendu) return "SUSPENDU";
  if (!dateExpiration) return "VALIDE";

  const aujourdHui = options.aujourdHui ?? new Date();
  const joursRestants = Math.ceil(
    (dateExpiration.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (joursRestants < 0) return "EXPIRE";
  if (joursRestants <= SEUIL_BIENTOT_ECHEANCE_JOURS) return "BIENTOT_ECHEANCE";
  return "VALIDE";
}
