import { prisma } from "@/lib/prisma";
import { annoterStatutProcedures } from "@/lib/procedures";

export type DocumentObsoleteUtilise = {
  type: "WPS" | "QMOS" | "PROCEDURE_INTERNE" | "PRODUIT_DIMENSIONNEL";
  reference: string;
  version: string;
  utiliseSur: string;
  lienHref: string;
};

export const LIBELLE_TYPE: Record<DocumentObsoleteUtilise["type"], string> = {
  WPS: "WPS/DMOS",
  QMOS: "QMOS",
  PROCEDURE_INTERNE: "Procédure interne",
  PRODUIT_DIMENSIONNEL: "Produit dimensionnel",
};

// Alerte "documents obsolètes" (voir le cahier des charges, "ALERTES") :
// signale quand une révision qui n'est plus "en vigueur" (une révision
// plus récente existe pour la même référence, ou la révision a été
// retirée — voir src/lib/procedures.ts, annoterStatutProcedures) est
// encore référencée quelque part — un joint qui pointe vers un ancien
// WPS/QMOS, une phase reliée à une ancienne procédure interne, un
// contrôle dimensionnel réalisé avec un ancien produit de la
// bibliothèque. Purement indicatif, jamais bloquant : Weldoc ne
// retire ni ne remplace rien tout seul, la correction reste humaine.
export async function documentsObsoletes(): Promise<DocumentObsoleteUtilise[]> {
  const resultat: DocumentObsoleteUtilise[] = [];

  const wpsList = await prisma.wps.findMany({
    select: {
      id: true,
      reference: true,
      version: true,
      dateEmission: true,
      retiree: true,
      joints: {
        where: { indiceReparation: 0 },
        select: { numero: true, affaire: { select: { numero: true } } },
      },
    },
  });
  for (const w of annoterStatutProcedures(wpsList, (w) => w.dateEmission)) {
    if (w.statutAffiche === "EN_VIGUEUR") continue;
    for (const j of w.joints) {
      resultat.push({
        type: "WPS",
        reference: w.reference,
        version: w.version,
        utiliseSur: `joint ${j.numero} (affaire ${j.affaire.numero})`,
        lienHref: "/joints",
      });
    }
  }

  const qmosList = await prisma.qmos.findMany({
    select: {
      id: true,
      reference: true,
      version: true,
      dateEssai: true,
      createdAt: true,
      retiree: true,
      joints: {
        where: { indiceReparation: 0 },
        select: { numero: true, affaire: { select: { numero: true } } },
      },
    },
  });
  for (const q of annoterStatutProcedures(qmosList, (q) => q.dateEssai ?? q.createdAt)) {
    if (q.statutAffiche === "EN_VIGUEUR") continue;
    for (const j of q.joints) {
      resultat.push({
        type: "QMOS",
        reference: q.reference,
        version: q.version,
        utiliseSur: `joint ${j.numero} (affaire ${j.affaire.numero})`,
        lienHref: "/joints",
      });
    }
  }

  const procList = await prisma.procedureInterne.findMany({
    select: {
      id: true,
      reference: true,
      version: true,
      dateEmission: true,
      retiree: true,
      phases: {
        select: { nom: true, sequence: { select: { affaire: { select: { numero: true } } } } },
      },
    },
  });
  for (const p of annoterStatutProcedures(procList, (p) => p.dateEmission)) {
    if (p.statutAffiche === "EN_VIGUEUR") continue;
    for (const ph of p.phases) {
      resultat.push({
        type: "PROCEDURE_INTERNE",
        reference: p.reference,
        version: p.version,
        utiliseSur: `phase ${ph.nom} (affaire ${ph.sequence.affaire.numero})`,
        lienHref: "/procedures",
      });
    }
  }

  const produitsList = await prisma.produitDimensionnel.findMany({
    select: {
      id: true,
      reference: true,
      version: true,
      createdAt: true,
      retiree: true,
      controles: {
        select: { joint: { select: { numero: true, affaire: { select: { numero: true } } } } },
      },
    },
  });
  for (const pd of annoterStatutProcedures(produitsList, (pd) => pd.createdAt)) {
    if (pd.statutAffiche === "EN_VIGUEUR") continue;
    for (const c of pd.controles) {
      resultat.push({
        type: "PRODUIT_DIMENSIONNEL",
        reference: pd.reference,
        version: pd.version,
        utiliseSur: `joint ${c.joint.numero} (affaire ${c.joint.affaire.numero})`,
        lienHref: "/joints",
      });
    }
  }

  return resultat;
}
