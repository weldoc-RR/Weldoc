// Temps et productivité (voir le cahier des charges, "TEMPS ET
// PRODUCTIVITÉ") : distingue temps théorique (barème de l'entreprise,
// Wps.tempsTheoriqueMin), temps prévu (Affectation.dureeEstimeeMin) et
// temps réel (FicheTechniqueSoudage.tempsMin). Les statistiques
// (médiane, percentiles) se calculent sur des configurations comparables
// — ici, tous les joints soudés avec le même WPS — et jamais par
// soudeur : le cahier des charges demande explicitement d'éviter de
// classer les soudeurs uniquement sur leur vitesse.

export function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 === 0 ? (triees[milieu - 1] + triees[milieu]) / 2 : triees[milieu];
}

// Percentile par interpolation linéaire (méthode courante, "type 7").
export function percentile(valeurs: number[], p: number): number | null {
  if (valeurs.length === 0) return null;
  const triees = [...valeurs].sort((a, b) => a - b);
  if (triees.length === 1) return triees[0];
  const rang = (p / 100) * (triees.length - 1);
  const bas = Math.floor(rang);
  const haut = Math.ceil(rang);
  if (bas === haut) return triees[bas];
  return triees[bas] + (triees[haut] - triees[bas]) * (rang - bas);
}

export interface StatistiquesTempsWps {
  wpsId: string;
  reference: string;
  version: string;
  tempsTheoriqueMin: number | null;
  nombreJoints: number;
  medianePrevueMin: number | null;
  medianeReelleMin: number | null;
  p25ReelMin: number | null;
  p75ReelMin: number | null;
  nombrePrevus: number;
}

// Calcule les statistiques de temps théorique/prévu/réel par WPS, à partir
// des fiches techniques de suivi de soudage signées (temps réel) et des
// affectations planifiées sur un joint (temps prévu). Regroupement par
// WPS = regroupement par "configuration comparable" (même procédé, même
// domaine) sans jamais distinguer par soudeur.
export function calculerStatistiquesTempsParWps(
  wpsList: { id: string; reference: string; version: string; tempsTheoriqueMin: number | null }[],
  tempsReel: { wpsId: string; tempsMin: number }[],
  tempsPrevu: { wpsId: string; dureeEstimeeMin: number }[]
): StatistiquesTempsWps[] {
  const reelParWps = new Map<string, number[]>();
  for (const t of tempsReel) {
    const liste = reelParWps.get(t.wpsId) ?? [];
    liste.push(t.tempsMin);
    reelParWps.set(t.wpsId, liste);
  }
  const prevuParWps = new Map<string, number[]>();
  for (const t of tempsPrevu) {
    const liste = prevuParWps.get(t.wpsId) ?? [];
    liste.push(t.dureeEstimeeMin);
    prevuParWps.set(t.wpsId, liste);
  }

  return wpsList
    .map((w) => {
      const valeursReelles = reelParWps.get(w.id) ?? [];
      const valeursPrevues = prevuParWps.get(w.id) ?? [];
      return {
        wpsId: w.id,
        reference: w.reference,
        version: w.version,
        tempsTheoriqueMin: w.tempsTheoriqueMin,
        nombreJoints: valeursReelles.length,
        medianePrevueMin: mediane(valeursPrevues),
        medianeReelleMin: mediane(valeursReelles),
        p25ReelMin: percentile(valeursReelles, 25),
        p75ReelMin: percentile(valeursReelles, 75),
        nombrePrevus: valeursPrevues.length,
      };
    })
    .filter((s) => s.nombreJoints > 0 || s.nombrePrevus > 0 || s.tempsTheoriqueMin !== null);
}
