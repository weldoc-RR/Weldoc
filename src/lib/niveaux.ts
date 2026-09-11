import type { NiveauDecision } from "@prisma/client";

// Intitulés affichés pour chaque niveau de décision (voir le cahier des
// charges) — purement une question de présentation : les droits
// eux-mêmes restent déterminés par NIVEAU_1/2/3 partout ailleurs
// (aNiveauMinimum, requireNiveau), jamais par cet intitulé.
export const LIBELLE_NIVEAU: Record<NiveauDecision, string> = {
  NIVEAU_1: "Exécutant",
  NIVEAU_2: "Contrôleur technique",
  NIVEAU_3: "Responsable",
};
