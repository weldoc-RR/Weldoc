/**
 * MOTEUR DE TOLÉRANCES DIMENSIONNELLES
 * =====================================
 * ⚠️ IMPORTANT : les valeurs ci-dessous sont des EXEMPLES ILLUSTRATIFS pour
 * démontrer le mécanisme, PAS des valeurs normatives réelles. Weldoc ne doit
 * jamais reproduire le texte intégral d'une norme protégée : cette table doit
 * être remplie avec les valeurs officielles (achetées/licenciées si
 * nécessaire) par une personne compétente avant toute utilisation réelle.
 *
 * Chaque calcul retourne les critères ET une référence traçable (norme +
 * version) — jamais un chiffre "sorti de nulle part".
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

// Table d'exemple — À REMPLACER par les tolérances réelles de la norme applicable.
const TABLE_EXEMPLE: Record<string, (d: DonneesTube) => CriteresDimensionnels> = {
  "EXEMPLE-DEMO": (d) => ({
    norme: "EXEMPLE-DEMO (placeholder, non normatif)",
    diametreNominalMm: d.diametreNominalMm,
    diametreMiniMm: d.diametreNominalMm - 0.5,
    diametreMaxiMm: d.diametreNominalMm + 0.5,
    epaisseurMiniMm: d.epaisseurNominaleMm * 0.9,
    epaisseurMaxiMm: d.epaisseurNominaleMm * 1.1,
  }),
};

export function determinerCriteres(donnees: DonneesTube): CriteresDimensionnels {
  const fn = TABLE_EXEMPLE[donnees.normeProduit];
  if (!fn) {
    throw new Error(
      `Aucune table de tolérances configurée pour la norme "${donnees.normeProduit}". ` +
        `Ajoutez les valeurs officielles dans src/lib/tolerances.ts avant utilisation réelle.`
    );
  }
  return fn(donnees);
}

export interface Mesure {
  position: string; // "0°", "90°", "180°", "270°"
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
