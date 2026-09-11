import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";
import { annoterStatutProcedures } from "@/lib/procedures";
import { statutActuel, pointBloque } from "@/lib/dossierReglementaire";

// Système qualité (voir le cahier des charges, "SYSTÈME QUALITÉ") :
// rassemble ce qui existe déjà ailleurs dans l'application (FNC,
// qualifications, signatures, audit trail, contrôles, dossier
// réglementaire, bibliothèques versionnées...) en indicateurs exploitables
// pour un audit ISO 9001 — rien de nouveau n'est stocké ici, tout est
// recalculé à la lecture à partir des modules existants. Weldoc fournit
// des preuves structurées, il ne "certifie" jamais l'entreprise lui-même.

export interface IndicateursQualite {
  qualifications: { valide: number; bientotEcheance: number; expire: number; suspendu: number };
  habilitations: { valide: number; bientotEcheance: number; expire: number; suspendu: number };
  formations: { valide: number; bientotEcheance: number; expire: number; suspendu: number };
  fnc: { total: number; ouvertes: number; cloturees: number; bloquantes: number };
  controles: { methode: string; total: number; conformes: number; nonConformes: number }[];
  signaturesTotal: number;
  documentsVersionnes: { categorie: string; enVigueur: number; ancienneVersion: number; retiree: number }[];
  pointsReglementairesBloquantsOuverts: number;
  rff: { affairesTotal: number; affairesValidees: number };
}

function compterParStatutValidite(items: { dateExpiration: Date | null; statut?: string }[]) {
  const compteur = { valide: 0, bientotEcheance: 0, expire: 0, suspendu: 0 };
  for (const item of items) {
    const statut = calculerStatut(item.dateExpiration, { suspendu: item.statut === "SUSPENDU" });
    if (statut === "VALIDE") compteur.valide++;
    else if (statut === "BIENTOT_ECHEANCE") compteur.bientotEcheance++;
    else if (statut === "EXPIRE") compteur.expire++;
    else if (statut === "SUSPENDU") compteur.suspendu++;
  }
  return compteur;
}

function compterVersions<T extends { id: string; reference: string; retiree: boolean }>(
  items: T[],
  dateDe: (item: T) => Date
) {
  const annotes = annoterStatutProcedures(items, dateDe);
  return {
    enVigueur: annotes.filter((a) => a.statutAffiche === "EN_VIGUEUR").length,
    ancienneVersion: annotes.filter((a) => a.statutAffiche === "ANCIENNE_VERSION").length,
    retiree: annotes.filter((a) => a.statutAffiche === "RETIREE").length,
  };
}

export async function calculerIndicateursQualite(): Promise<IndicateursQualite> {
  const [
    qualifications,
    habilitations,
    formations,
    fncs,
    rowsDim,
    rowsVt,
    rowsPt,
    rowsMt,
    rowsRt,
    rowsUt,
    signaturesTotal,
    wpsList,
    qmosList,
    procInternesList,
    documentsExternesList,
    produitsDimList,
    pointsReglementaires,
    affairesTotal,
    affairesValidees,
  ] = await Promise.all([
    prisma.qualification.findMany({ select: { dateExpiration: true, statut: true } }),
    prisma.habilitation.findMany({ select: { dateExpiration: true, statut: true } }),
    prisma.formation.findMany({ select: { dateExpiration: true, statut: true } }),
    prisma.fNC.findMany({ select: { statut: true, impact: true } }),
    prisma.controleDimensionnel.findMany({ select: { resultat: true } }),
    prisma.controleVisuel.findMany({ select: { resultat: true } }),
    prisma.controleRessuage.findMany({ select: { resultat: true } }),
    prisma.controleMagnetoscopie.findMany({ select: { resultat: true } }),
    prisma.controleRadiographie.findMany({ select: { resultat: true } }),
    prisma.controleUltrasons.findMany({ select: { resultat: true } }),
    prisma.signature.count(),
    prisma.wps.findMany({ select: { id: true, reference: true, retiree: true, dateEmission: true } }),
    prisma.qmos.findMany({ select: { id: true, reference: true, retiree: true, dateEssai: true, createdAt: true } }),
    prisma.procedureInterne.findMany({ select: { id: true, reference: true, retiree: true, dateEmission: true } }),
    prisma.documentExterne.findMany({ select: { id: true, reference: true, retiree: true, dateImport: true } }),
    prisma.produitDimensionnel.findMany({ select: { id: true, reference: true, retiree: true, createdAt: true } }),
    prisma.pointReglementaire.findMany({
      include: { evenements: { orderBy: { date: "desc" }, take: 1 } },
    }),
    prisma.affaire.count(),
    prisma.signature.count({ where: { documentType: "RAPPORT_FIN_FABRICATION" } }),
  ]);

  const controlesParMethode: { methode: string; rows: { resultat: string }[] }[] = [
    { methode: "Dimensionnel", rows: rowsDim },
    { methode: "Visuel (VT)", rows: rowsVt },
    { methode: "Ressuage (PT)", rows: rowsPt },
    { methode: "Magnétoscopie (MT)", rows: rowsMt },
    { methode: "Radiographie (RT)", rows: rowsRt },
    { methode: "Ultrasons (UT)", rows: rowsUt },
  ];

  const controles = controlesParMethode.map((c) => ({
    methode: c.methode,
    total: c.rows.length,
    conformes: c.rows.filter((r) => r.resultat === "CONFORME").length,
    nonConformes: c.rows.filter((r) => r.resultat !== "CONFORME").length,
  }));

  const pointsBloquantsOuverts = pointsReglementaires.filter((p) => {
    const statut = statutActuel(p.evenements);
    return statut !== null && pointBloque(statut);
  }).length;

  return {
    qualifications: compterParStatutValidite(qualifications),
    habilitations: compterParStatutValidite(habilitations),
    formations: compterParStatutValidite(formations),
    fnc: {
      total: fncs.length,
      ouvertes: fncs.filter((f) => f.statut !== "CLOTUREE").length,
      cloturees: fncs.filter((f) => f.statut === "CLOTUREE").length,
      bloquantes: fncs.filter((f) => f.impact === "BLOQUANTE" && f.statut !== "CLOTUREE").length,
    },
    controles,
    signaturesTotal,
    documentsVersionnes: [
      { categorie: "WPS/DMOS", ...compterVersions(wpsList, (w) => w.dateEmission) },
      { categorie: "QMOS", ...compterVersions(qmosList, (q) => q.dateEssai ?? q.createdAt) },
      { categorie: "Procédures internes", ...compterVersions(procInternesList, (p) => p.dateEmission) },
      { categorie: "Documents externes", ...compterVersions(documentsExternesList, (d) => d.dateImport) },
      { categorie: "Bibliothèque dimensionnelle", ...compterVersions(produitsDimList, (p) => p.createdAt) },
    ],
    pointsReglementairesBloquantsOuverts: pointsBloquantsOuverts,
    rff: { affairesTotal, affairesValidees },
  };
}
