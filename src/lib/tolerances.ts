/**
 * MOTEUR DE TOLÉRANCES DIMENSIONNELLES
 * =====================================
 * ⚠️ IMPORTANT : Weldoc ne doit jamais reproduire le texte intégral d'une
 * norme protégée (mise en page, légendes de tableau, notes, en-têtes...).
 * Les fonctions ci-dessous encodent uniquement la RÈGLE DE CALCUL (seuils
 * numériques traduits en code, avec des noms de variables), jamais une
 * copie du document — chacune reste traçable vers une norme, un tableau et
 * une version précise via le champ `norme` du résultat. Ces règles ont été
 * transmises par un utilisateur détenant l'accès licencié à la norme
 * correspondante (voir PRINCIPE de CLAUDE.md : "utiliser des valeurs
 * placeholder tant que les vraies valeurs n'ont pas été fournies par
 * l'utilisateur ou un expert métier").
 *
 * Tant qu'aucune règle réelle n'est enregistrée pour une norme donnée,
 * utiliser "EXEMPLE-DEMO" (placeholder, non normatif) pour démontrer le
 * mécanisme.
 */

export interface CriteresDimensionnels {
  norme: string;
  diametreNominalMm: number;
  diametreMiniMm: number;
  diametreMaxiMm: number;
  epaisseurMiniMm: number;
  epaisseurMaxiMm: number;
}

export interface DonneesTube {
  normeProduit: string;
  diametreNominalMm: number;
  epaisseurNominaleMm: number;
}

// Tolérance sur le diamètre extérieur commune aux tableaux 7 et 9 de
// l'EN 10216-2 : la plus grande des deux valeurs entre ±1 % et ±0,5 mm,
// quel que soit D.
function toleranceDiametreExterieurEn10216(diametreNominalMm: number): number {
  return Math.max(diametreNominalMm * 0.01, 0.5);
}

// EN 10216-2:2013+A1:2019, Tableau 7 — tolérances sur le diamètre
// extérieur et l'épaisseur (épaisseur nominale T). Pour D > 219,1 mm, le
// pourcentage appliqué à T dépend du rapport T/D. Simplification connue :
// la tolérance locale supplémentaire (+5 % sur l'épaisseur maxi pour
// D ≥ 355,6 mm) n'est pas appliquée ici — seul le cas général (mesure non
// locale) est couvert.
function toleranceEn10216Tableau7(d: DonneesTube): CriteresDimensionnels {
  const D = d.diametreNominalMm;
  const T = d.epaisseurNominaleMm;
  const toleranceDmm = toleranceDiametreExterieurEn10216(D);

  let toleranceTmm: number;
  if (D <= 219.1) {
    toleranceTmm = Math.max(T * 0.125, 0.4);
  } else {
    const ratio = T / D;
    const pourcentage = ratio <= 0.025 ? 0.2 : ratio <= 0.05 ? 0.15 : ratio <= 0.1 ? 0.125 : 0.1;
    toleranceTmm = T * pourcentage;
  }

  return {
    norme: "EN 10216-2:2013+A1:2019, Tableau 7",
    diametreNominalMm: D,
    diametreMiniMm: D - toleranceDmm,
    diametreMaxiMm: D + toleranceDmm,
    epaisseurMiniMm: T - toleranceTmm,
    epaisseurMaxiMm: T + toleranceTmm,
  };
}

// EN 10216-2:2013+A1:2019, Tableau 9 — tolérances sur le diamètre
// extérieur et l'ÉPAISSEUR MINIMALE GARANTIE (Tmin), pour les tubes
// commandés sur cette base plutôt que sur une épaisseur nominale.
// `epaisseurNominaleMm` représente ici Tmin (pas une épaisseur nominale
// classique). La tolérance sur l'épaisseur n'est que positive (0 à +X) :
// l'épaisseur ne doit jamais descendre sous Tmin. Même simplification que
// le Tableau 7 pour la tolérance locale D ≥ 355,6 mm.
function toleranceEn10216Tableau9(d: DonneesTube): CriteresDimensionnels {
  const D = d.diametreNominalMm;
  const Tmin = d.epaisseurNominaleMm;
  const toleranceDmm = toleranceDiametreExterieurEn10216(D);

  let toleranceTmm: number;
  if (D <= 219.1) {
    toleranceTmm = Math.max(Tmin * 0.28, 0.8);
  } else {
    const ratio = Tmin / D;
    const pourcentage = ratio <= 0.02 ? 0.5 : ratio <= 0.04 ? 0.35 : ratio <= 0.09 ? 0.28 : 0.22;
    toleranceTmm = Tmin * pourcentage;
  }

  return {
    norme: "EN 10216-2:2013+A1:2019, Tableau 9",
    diametreNominalMm: D,
    diametreMiniMm: D - toleranceDmm,
    diametreMaxiMm: D + toleranceDmm,
    epaisseurMiniMm: Tmin,
    epaisseurMaxiMm: Tmin + toleranceTmm,
  };
}

// EN 10216-2:2013+A1:2019, Tableau 11 — tolérances sur le diamètre
// extérieur et l'épaisseur pour les tubes commandés finis à froid (pas de
// dépendance au rapport T/D, contrairement aux tableaux 7 et 9).
function toleranceEn10216Tableau11(d: DonneesTube): CriteresDimensionnels {
  const D = d.diametreNominalMm;
  const T = d.epaisseurNominaleMm;
  const toleranceDmm = Math.max(D * 0.005, 0.3);
  const toleranceTmm = Math.max(T * 0.1, 0.2);

  return {
    norme: "EN 10216-2:2013+A1:2019, Tableau 11",
    diametreNominalMm: D,
    diametreMiniMm: D - toleranceDmm,
    diametreMaxiMm: D + toleranceDmm,
    epaisseurMiniMm: T - toleranceTmm,
    epaisseurMaxiMm: T + toleranceTmm,
  };
}

const TABLE_TOLERANCES: Record<string, (d: DonneesTube) => CriteresDimensionnels> = {
  "EXEMPLE-DEMO": (d) => ({
    norme: "EXEMPLE-DEMO (placeholder, non normatif)",
    diametreNominalMm: d.diametreNominalMm,
    diametreMiniMm: d.diametreNominalMm - 0.5,
    diametreMaxiMm: d.diametreNominalMm + 0.5,
    epaisseurMiniMm: d.epaisseurNominaleMm * 0.9,
    epaisseurMaxiMm: d.epaisseurNominaleMm * 1.1,
  }),
  // Les trois clés ci-dessous doivent être saisies telles quelles dans
  // Matiere.normeProduit (à l'import du CCPU) ou dans le champ "norme
  // produit" d'un contrôle dimensionnel pour être reconnues automatiquement.
  "EN 10216-2 (T nominale)": toleranceEn10216Tableau7,
  "EN 10216-2 (Tmin)": toleranceEn10216Tableau9,
  "EN 10216-2 (fini à froid)": toleranceEn10216Tableau11,
};

export function determinerCriteres(donnees: DonneesTube): CriteresDimensionnels {
  const fn = TABLE_TOLERANCES[donnees.normeProduit];
  if (!fn) {
    throw new Error(
      `Aucune règle de tolérance configurée pour la norme "${donnees.normeProduit}". ` +
        `Ajoutez-la dans src/lib/tolerances.ts (valeurs fournies par un expert métier avec accès à la norme) ` +
        `avant utilisation réelle, ou choisissez un produit de la bibliothèque dimensionnelle.`
    );
  }
  return fn(donnees);
}

export interface Mesure {
  position: string;
  diametreMm?: number;
  epaisseurMm?: number;
}

export type ResultatConformite = "CONFORME" | "HORS_TOLERANCE" | "A_VERIFIER";

export function evaluerConformite(
  mesures: Mesure[],
  criteres: CriteresDimensionnels
): ResultatConformite {
  for (const m of mesures) {
    if (m.diametreMm !== undefined) {
      if (m.diametreMm < criteres.diametreMiniMm || m.diametreMm > criteres.diametreMaxiMm) {
        return "HORS_TOLERANCE";
      }
    }
    if (m.epaisseurMm !== undefined) {
      if (m.epaisseurMm < criteres.epaisseurMiniMm || m.epaisseurMm > criteres.epaisseurMaxiMm) {
        return "HORS_TOLERANCE";
      }
    }
  }
  return "CONFORME";
}
