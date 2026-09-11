// Statut d'une révision de WPS/DMOS ou de QMOS, calculé à la lecture — comme
// calculerStatut (qualifications) et calculerStatutOutil (outillage) — et
// jamais stocké : une révision n'est jamais modifiée après coup, "en
// vigueur" n'est vrai que tant qu'aucune révision plus récente n'existe
// pour la même référence.
export type StatutAffichageProcedure = "EN_VIGUEUR" | "ANCIENNE_VERSION" | "RETIREE";

export function calculerStatutProcedure(retiree: boolean, estLaPlusRecente: boolean): StatutAffichageProcedure {
  if (retiree) return "RETIREE";
  return estLaPlusRecente ? "EN_VIGUEUR" : "ANCIENNE_VERSION";
}

// Annote une liste de révisions (déjà triées ou non) avec leur statut
// affiché, en déterminant pour chaque `reference` la révision la plus
// récente par dateEmission/dateEssai.
export function annoterStatutProcedures<T extends { id: string; reference: string; retiree: boolean }>(
  items: T[],
  dateDe: (item: T) => Date
): (T & { statutAffiche: StatutAffichageProcedure })[] {
  const plusRecenteParReference = new Map<string, string>();
  for (const item of items) {
    const idActuel = plusRecenteParReference.get(item.reference);
    if (!idActuel) {
      plusRecenteParReference.set(item.reference, item.id);
      continue;
    }
    const actuel = items.find((i) => i.id === idActuel)!;
    if (dateDe(item).getTime() > dateDe(actuel).getTime()) {
      plusRecenteParReference.set(item.reference, item.id);
    }
  }

  return items.map((item) => ({
    ...item,
    statutAffiche: calculerStatutProcedure(item.retiree, plusRecenteParReference.get(item.reference) === item.id),
  }));
}
