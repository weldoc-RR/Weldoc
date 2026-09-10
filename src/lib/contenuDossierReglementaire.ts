import { prisma } from "@/lib/prisma";

// Contenu du dossier réglementaire (voir le cahier des charges, "DOSSIER
// RÉGLEMENTAIRE" : "alimenté par les données déjà saisies") : le tableau
// des joints de l'affaire avec, pour chacun, les procès-verbaux déjà
// enregistrés (FTS, et le "N° de PV" de chacun des cinq contrôles à
// indications — VT/PT/MT/RT/UT — voir ConditionsExamenSchema dans
// src/lib/controles.ts). Le contrôle dimensionnel (DIM) n'a pas de numéro
// de PV dans Weldoc, seulement un résultat. Compilé à la lecture à partir
// de ce qui existe déjà, rien n'est ressaisi ni stocké ici.
//
// Volontairement pas de rapport qualifications/COFREND des intervenants
// ici : cette vérification est déjà faite en amont, au moment où la
// personne réalise le contrôle (voir /alertes, "qualifications"/
// "habilitations") — la reprendre une deuxième fois dans le dossier
// réglementaire ferait doublon.

export type LigneJointPV = {
  jointId: string;
  numeroAffiche: string;
  wpsReference: string | null;
  soudeur: string | null;
  ficheSoudage: { id: string; signee: boolean } | null;
  dimensionnel: { resultat: string; date: Date }[];
  visuel: { numeroPV: string | null; resultat: string; date: Date }[];
  ressuage: { numeroPV: string | null; resultat: string; date: Date }[];
  magnetoscopie: { numeroPV: string | null; resultat: string; date: Date }[];
  radiographie: { numeroPV: string | null; resultat: string; date: Date }[];
  ultrasons: { numeroPV: string | null; resultat: string; date: Date }[];
};

export async function lignesJointsPV(affaireId: string): Promise<LigneJointPV[]> {
  const joints = await prisma.joint.findMany({
    where: { affaireId },
    orderBy: [{ numero: "asc" }, { indiceReparation: "asc" }],
    include: {
      wps: { select: { reference: true } },
      soudeur: { select: { nom: true, prenom: true } },
      ficheSoudage: { select: { id: true, signatureId: true } },
      controlesDim: { select: { resultat: true, dateControle: true } },
      controlesVisuels: { select: { numeroPV: true, resultat: true, dateControle: true } },
      controlesRessuage: { select: { numeroPV: true, resultat: true, dateControle: true } },
      controlesMagnetoscopie: { select: { numeroPV: true, resultat: true, dateControle: true } },
      controlesRadiographie: { select: { numeroPV: true, resultat: true, dateControle: true } },
      controlesUltrasons: { select: { numeroPV: true, resultat: true, dateControle: true } },
    },
  });

  return joints.map((j) => ({
    jointId: j.id,
    numeroAffiche: j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero,
    wpsReference: j.wps?.reference ?? j.wpsReference,
    soudeur: j.soudeur ? `${j.soudeur.prenom} ${j.soudeur.nom}` : null,
    ficheSoudage: j.ficheSoudage ? { id: j.ficheSoudage.id, signee: j.ficheSoudage.signatureId !== null } : null,
    dimensionnel: j.controlesDim.map((c) => ({ resultat: c.resultat, date: c.dateControle })),
    visuel: j.controlesVisuels.map((c) => ({ numeroPV: c.numeroPV, resultat: c.resultat, date: c.dateControle })),
    ressuage: j.controlesRessuage.map((c) => ({ numeroPV: c.numeroPV, resultat: c.resultat, date: c.dateControle })),
    magnetoscopie: j.controlesMagnetoscopie.map((c) => ({ numeroPV: c.numeroPV, resultat: c.resultat, date: c.dateControle })),
    radiographie: j.controlesRadiographie.map((c) => ({ numeroPV: c.numeroPV, resultat: c.resultat, date: c.dateControle })),
    ultrasons: j.controlesUltrasons.map((c) => ({ numeroPV: c.numeroPV, resultat: c.resultat, date: c.dateControle })),
  }));
}
