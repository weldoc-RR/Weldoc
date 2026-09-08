import { prisma } from "@/lib/prisma";

// Avancement d'une affaire : calculé à la lecture à partir des phases du
// séquencement (voir src/lib/sequencement.ts) — ce sont elles qui
// représentent les "tâches" du dossier de fabrication (approvisionnement,
// soudage, contrôles, vérification finale...). Rien n'est stocké : comme
// pour calculerStatut/calculerStatutOutil, on recalcule à chaque lecture
// pour ne jamais avoir un pourcentage qui se périme.
export interface AvancementSequence {
  sequenceId: string;
  ordre: number;
  nom: string;
  totalPhases: number;
  terminees: number;
  enCours: number;
  aFaire: number;
  nonApplicables: number;
  // Sur les phases applicables uniquement (NON_APPLICABLE exclue du calcul,
  // comme une phase qui n'a jamais eu à être faite sur cette affaire).
  pourcentage: number;
}

export interface AvancementAffaire {
  affaireId: string;
  pourcentageGlobal: number;
  sequences: AvancementSequence[];
  joints: {
    total: number;
    reparations: number;
    controlesDimensionnelsConformes: number;
  };
  fnc: {
    total: number;
    ouvertes: number;
    cloturees: number;
  };
}

export async function calculerAvancementAffaire(affaireId: string): Promise<AvancementAffaire> {
  const sequences = await prisma.sequence.findMany({
    where: { affaireId },
    include: { phases: true },
    orderBy: { ordre: "asc" },
  });

  let totalApplicablesGlobal = 0;
  let totalTermineesGlobal = 0;

  const sequencesAvancement: AvancementSequence[] = sequences.map((sequence) => {
    const terminees = sequence.phases.filter((p) => p.statut === "TERMINEE").length;
    const enCours = sequence.phases.filter((p) => p.statut === "EN_COURS").length;
    const nonApplicables = sequence.phases.filter((p) => p.statut === "NON_APPLICABLE").length;
    const aFaire = sequence.phases.length - terminees - enCours - nonApplicables;
    const applicables = sequence.phases.length - nonApplicables;

    totalApplicablesGlobal += applicables;
    totalTermineesGlobal += terminees;

    return {
      sequenceId: sequence.id,
      ordre: sequence.ordre,
      nom: sequence.nom,
      totalPhases: sequence.phases.length,
      terminees,
      enCours,
      aFaire,
      nonApplicables,
      pourcentage: applicables > 0 ? Math.round((terminees / applicables) * 100) : 0,
    };
  });

  const joints = await prisma.joint.findMany({
    where: { affaireId },
    include: { controlesDim: true },
  });
  const jointsOrigine = joints.filter((j) => j.indiceReparation === 0);
  const controlesDimensionnelsConformes = joints.filter((j) =>
    j.controlesDim.some((c) => c.resultat === "CONFORME")
  ).length;

  const fncs = await prisma.fNC.findMany({ where: { affaireId } });
  const fncOuvertes = fncs.filter((f) => f.statut !== "CLOTUREE").length;

  return {
    affaireId,
    pourcentageGlobal: totalApplicablesGlobal > 0 ? Math.round((totalTermineesGlobal / totalApplicablesGlobal) * 100) : 0,
    sequences: sequencesAvancement,
    joints: {
      total: jointsOrigine.length,
      reparations: joints.length - jointsOrigine.length,
      controlesDimensionnelsConformes,
    },
    fnc: {
      total: fncs.length,
      ouvertes: fncOuvertes,
      cloturees: fncs.length - fncOuvertes,
    },
  };
}
