// Rapprochement rôle/action (voir le cahier des charges, "DROITS ET
// MODIFICATIONS" : "Droits définis par rôle, niveau, qualification,
// autorisation, contexte de l'affaire") : niveau (1/2/3), qualification et
// contexte de l'affaire sont déjà des axes actifs ailleurs dans Weldoc — le
// rôle (la ou les fonctions d'une personne, PersonnelFonction) restait
// jusqu'ici purement descriptif. Comme pour la QS (voir
// src/lib/verificationQS.ts), ce rapprochement est un signal d'aide,
// jamais une décision : il n'empêche jamais une affectation ou un
// enregistrement, et ne remplace pas le jugement d'une personne compétente.
// Une personne sans aucune fonction enregistrée déclenche l'alerte au même
// titre qu'une fonction ne correspondant pas — l'absence de donnée est ici
// elle-même le signal (contrairement à la QS, qui compare des plages
// numériques où une donnée manquante d'un côté ne permet simplement pas de
// conclure).

// Suggestions issues du cahier des charges ("plusieurs fonctions possibles
// (soudeur, contrôleur, contrôleur CND, chargé de travaux, contremaître,
// chargé d'affaires, coordinateur soudage, ingénieur soudage, ingénieur,
// responsable qualité, exécutant, vérificateur, autres configurables)") :
// une liste indicative dans un <datalist>, jamais une liste fermée — le
// champ reste du texte libre pour rester "configurable" comme demandé.
export const FONCTIONS_SUGGEREES = [
  "Soudeur",
  "Contrôleur",
  "Contrôleur CND",
  "Chargé de travaux",
  "Contremaître",
  "Chargé d'affaires",
  "Coordinateur soudage",
  "Ingénieur soudage",
  "Ingénieur",
  "Responsable qualité",
  "Exécutant",
  "Vérificateur",
];

export const FONCTION_SOUDEUR = "Soudeur";

function normalise(fonction: string): string {
  return fonction.trim().toLowerCase();
}

// Rapprochement volontairement simple (égalité après normalisation, pas de
// correspondance floue) : une fonction saisie différemment de la
// suggestion (accent, casse, espaces) est reconnue, mais un synonyme non
// prévu (ex. "Opérateur soudage" pour "Soudeur") ne l'est pas — Weldoc ne
// devine pas les équivalences propres à chaque entreprise.
export function correspondFonction(fonctionsPersonne: string[], fonctionAttendue: string): boolean {
  const attendue = normalise(fonctionAttendue);
  return fonctionsPersonne.some((f) => normalise(f) === attendue);
}
