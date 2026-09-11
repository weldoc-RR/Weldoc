export type CompteurAlertesStatuts = {
  urgentes: number;
  bientotEcheance: number;
};

// Agrège les statuts déjà calculés (qualifications, habilitations, acuité
// visuelle, documents justificatifs actuels d'une personne — voir
// /personnel) en deux compteurs, pour afficher un résumé en tête de fiche
// plutôt que d'avoir à lire chaque ligne pour repérer un problème.
// SUSPENDU compte comme "urgente" au même titre qu'EXPIRE : dans les deux
// cas, la personne n'est plus couverte pour agir tout de suite.
export function compterAlertesStatuts(statuts: string[]): CompteurAlertesStatuts {
  let urgentes = 0;
  let bientotEcheance = 0;
  for (const statut of statuts) {
    if (statut === "EXPIRE" || statut === "SUSPENDU") urgentes++;
    else if (statut === "BIENTOT_ECHEANCE" || statut === "EN_RENOUVELLEMENT") bientotEcheance++;
  }
  return { urgentes, bientotEcheance };
}
