import { prisma } from "@/lib/prisma";

// Séquences par défaut du dossier de fabrication, dans l'ordre, comme
// listées au cahier des charges. Créées automatiquement à la création
// d'une affaire ; des séquences supplémentaires restent ajoutables ensuite
// via POST /api/sequences si besoin (un séquencement adapté est possible).
const SEQUENCES_PAR_DEFAUT = [
  "Prise en charge",
  "Préparation",
  "Soudage et contrôles",
  "Remise en conformité / finalisation",
  "Vérification finale",
];

export async function creerSequencesParDefaut(affaireId: string): Promise<void> {
  for (const [index, nom] of SEQUENCES_PAR_DEFAUT.entries()) {
    await prisma.sequence.create({ data: { affaireId, ordre: index + 1, nom } });
  }
}

const STATUTS_COMPLETS = new Set(["TERMINEE", "NON_APPLICABLE"]);

// Par défaut, une séquence suivante ne peut démarrer avant que toutes les
// phases des séquences précédentes (même affaire) soient terminées ou non
// applicables. Une demande de modification de séquencement ACCEPTEE, qui
// liste explicitement cette phase, lève ce blocage pour elle — jamais
// automatiquement, toujours via une décision humaine de niveau 3 tracée
// (voir POST /api/demandes-sequencement/[id]/decision).
export async function verifierSequencementAutorise(
  phaseId: string
): Promise<{ autorise: boolean; motif?: string }> {
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    include: { sequence: true },
  });
  if (!phase) return { autorise: false, motif: "Phase introuvable." };

  const sequencesPrecedentes = await prisma.sequence.findMany({
    where: { affaireId: phase.sequence.affaireId, ordre: { lt: phase.sequence.ordre } },
    include: { phases: true },
  });

  const phasesIncompletes = sequencesPrecedentes.flatMap((s) =>
    s.phases.filter((p) => !STATUTS_COMPLETS.has(p.statut)).map((p) => `${s.nom} — ${p.nom}`)
  );

  if (phasesIncompletes.length === 0) {
    return { autorise: true };
  }

  const derogationAcceptee = await prisma.demandeModificationSequencement.findFirst({
    where: {
      affaireId: phase.sequence.affaireId,
      statut: "ACCEPTEE",
      phasesConcerneesIds: { has: phaseId },
    },
  });
  if (derogationAcceptee) {
    return { autorise: true };
  }

  return {
    autorise: false,
    motif: `Séquence précédente non terminée (${phasesIncompletes.join(", ")}). Une demande de modification de séquencement peut être soumise si un ordre différent est nécessaire.`,
  };
}
