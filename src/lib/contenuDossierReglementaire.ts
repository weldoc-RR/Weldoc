import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";

// Contenu du dossier réglementaire (voir le cahier des charges, "DOSSIER
// RÉGLEMENTAIRE" : "alimenté par les données déjà saisies") — deux volets,
// tous deux compilés à la lecture à partir de ce qui existe déjà, rien
// n'est ressaisi ni stocké ici :
// 1. Le tableau des joints de l'affaire avec, pour chacun, les procès-
//    verbaux déjà enregistrés (FTS, et le "N° de PV" de chacun des cinq
//    contrôles à indications — VT/PT/MT/RT/UT — voir ConditionsExamenSchema
//    dans src/lib/controles.ts). Le contrôle dimensionnel (DIM) n'a pas de
//    numéro de PV dans Weldoc, seulement un résultat.
// 2. Le rapport COFREND des intervenants CND : les personnes ayant réalisé
//    au moins un des cinq contrôles CND (VT/PT/MT/RT/UT, le périmètre réel
//    de la certification COFREND) sur un joint de l'affaire, avec leurs
//    qualifications CND (Qualification.type === "CND").

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

export type IntervenantCND = {
  personnelId: string;
  nom: string;
  prenom: string;
  methodes: string[];
  qualifications: {
    id: string;
    reference: string;
    norme: string;
    procede: string | null;
    dateObtention: Date;
    dateExpiration: Date | null;
    statutAffiche: string;
  }[];
};

export async function intervenantsCND(affaireId: string): Promise<IntervenantCND[]> {
  const [visuel, ressuage, magnetoscopie, radiographie, ultrasons] = await Promise.all([
    prisma.controleVisuel.findMany({
      where: { joint: { affaireId } },
      select: { controleurId: true, controleur: { select: { nom: true, prenom: true } } },
    }),
    prisma.controleRessuage.findMany({
      where: { joint: { affaireId } },
      select: { controleurId: true, controleur: { select: { nom: true, prenom: true } } },
    }),
    prisma.controleMagnetoscopie.findMany({
      where: { joint: { affaireId } },
      select: { controleurId: true, controleur: { select: { nom: true, prenom: true } } },
    }),
    prisma.controleRadiographie.findMany({
      where: { joint: { affaireId } },
      select: { controleurId: true, controleur: { select: { nom: true, prenom: true } } },
    }),
    prisma.controleUltrasons.findMany({
      where: { joint: { affaireId } },
      select: { controleurId: true, controleur: { select: { nom: true, prenom: true } } },
    }),
  ]);

  const parPersonne = new Map<
    string,
    { nom: string; prenom: string; methodes: Set<string> }
  >();
  const ajouter = (rows: { controleurId: string; controleur: { nom: string; prenom: string } }[], methode: string) => {
    for (const r of rows) {
      const existant = parPersonne.get(r.controleurId);
      if (existant) existant.methodes.add(methode);
      else parPersonne.set(r.controleurId, { nom: r.controleur.nom, prenom: r.controleur.prenom, methodes: new Set([methode]) });
    }
  };
  ajouter(visuel, "VT");
  ajouter(ressuage, "PT");
  ajouter(magnetoscopie, "MT");
  ajouter(radiographie, "RT");
  ajouter(ultrasons, "UT");

  if (parPersonne.size === 0) return [];

  const qualifications = await prisma.qualification.findMany({
    where: { personnelId: { in: [...parPersonne.keys()] }, type: "CND" },
    orderBy: { dateObtention: "desc" },
  });
  const qualifsParPersonne = new Map<string, typeof qualifications>();
  for (const q of qualifications) {
    const liste = qualifsParPersonne.get(q.personnelId) ?? [];
    liste.push(q);
    qualifsParPersonne.set(q.personnelId, liste);
  }

  return [...parPersonne.entries()].map(([personnelId, info]) => ({
    personnelId,
    nom: info.nom,
    prenom: info.prenom,
    methodes: [...info.methodes].sort(),
    qualifications: (qualifsParPersonne.get(personnelId) ?? []).map((q) => ({
      id: q.id,
      reference: q.reference,
      norme: q.norme,
      procede: q.procede,
      dateObtention: q.dateObtention,
      dateExpiration: q.dateExpiration,
      statutAffiche: calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }),
    })),
  }));
}
