import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";

// Contenu du dossier réglementaire (voir le cahier des charges, "DOSSIER
// RÉGLEMENTAIRE" : "alimenté par les données déjà saisies") : le corps du
// document (le tableau des joints avec leurs procès-verbaux, voir
// lignesJointsPV) et une annexe (annexeIntervenants) qui reprend, pour
// archivage dans le dossier transmis à l'organisme, l'état des
// qualifications/acuités visuelles des intervenants au moment de la
// compilation — la vérification elle-même (et le blocage si elle n'est
// plus valide) a déjà eu lieu en amont, au moment où chacun a réalisé son
// contrôle (voir src/lib/aptitudePersonnel.ts et /alertes) : cette annexe
// n'est qu'un état des lieux archivé, pas une nouvelle vérification.

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

type QualificationAffichee = {
  id: string;
  reference: string;
  norme: string;
  procede: string | null;
  dateObtention: Date;
  dateExpiration: Date | null;
  statutAffiche: string;
};

export type IntervenantAffaire = {
  personnelId: string;
  nom: string;
  prenom: string;
  role: "SOUDEUR" | "CONTROLEUR_CND";
  // Méthodes CND réalisées sur cette affaire (vide pour un soudeur).
  methodes: string[];
  qualifications: QualificationAffichee[];
  // Dernier test d'acuité visuelle enregistré (uniquement pertinent pour
  // un contrôleur CND — voir src/lib/aptitudePersonnel.ts) ; null si aucun
  // test n'est enregistré pour cette personne.
  acuiteVisuelle: { dateTest: Date; dateExpiration: Date | null; apte: boolean; statutAffiche: string } | null;
};

function statutQualification(q: { statut: string; dateExpiration: Date | null }): string {
  return calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" });
}

// Annexe "Qualifications et aptitudes des intervenants" (voir le cahier
// des charges, "DOSSIER RÉGLEMENTAIRE") : archive, pour chaque personne
// ayant soudé ou réalisé un contrôle CND sur l'affaire, l'état de ses
// qualifications (soudage ou CND) et, pour un contrôleur CND, de son
// acuité visuelle — les deux vérifications déjà appliquées en amont (voir
// src/lib/aptitudePersonnel.ts) au moment de chaque action.
export async function annexeIntervenants(affaireId: string): Promise<IntervenantAffaire[]> {
  const [soudeurs, visuel, ressuage, magnetoscopie, radiographie, ultrasons] = await Promise.all([
    prisma.joint.findMany({
      where: { affaireId, soudeurId: { not: null } },
      select: { soudeurId: true, soudeur: { select: { nom: true, prenom: true } } },
    }),
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

  const soudeursParPersonne = new Map<string, { nom: string; prenom: string }>();
  for (const j of soudeurs) {
    if (j.soudeurId && j.soudeur) soudeursParPersonne.set(j.soudeurId, j.soudeur);
  }

  const cndParPersonne = new Map<string, { nom: string; prenom: string; methodes: Set<string> }>();
  const ajouter = (rows: { controleurId: string; controleur: { nom: string; prenom: string } }[], methode: string) => {
    for (const r of rows) {
      const existant = cndParPersonne.get(r.controleurId);
      if (existant) existant.methodes.add(methode);
      else cndParPersonne.set(r.controleurId, { nom: r.controleur.nom, prenom: r.controleur.prenom, methodes: new Set([methode]) });
    }
  };
  ajouter(visuel, "VT");
  ajouter(ressuage, "PT");
  ajouter(magnetoscopie, "MT");
  ajouter(radiographie, "RT");
  ajouter(ultrasons, "UT");

  const tousLesIds = new Set([...soudeursParPersonne.keys(), ...cndParPersonne.keys()]);
  if (tousLesIds.size === 0) return [];

  const [qualifications, acuites] = await Promise.all([
    prisma.qualification.findMany({ where: { personnelId: { in: [...tousLesIds] } } }),
    prisma.acuiteVisuelle.findMany({ where: { personnelId: { in: [...tousLesIds] } }, orderBy: { dateTest: "desc" } }),
  ]);
  const qualifsParPersonne = new Map<string, typeof qualifications>();
  for (const q of qualifications) {
    const liste = qualifsParPersonne.get(q.personnelId) ?? [];
    liste.push(q);
    qualifsParPersonne.set(q.personnelId, liste);
  }
  const acuiteParPersonne = new Map<string, (typeof acuites)[number]>();
  for (const a of acuites) {
    if (!acuiteParPersonne.has(a.personnelId)) acuiteParPersonne.set(a.personnelId, a);
  }

  const qualificationsAffichees = (personnelId: string, type: "SOUDAGE" | "CND"): QualificationAffichee[] =>
    (qualifsParPersonne.get(personnelId) ?? [])
      .filter((q) => q.type === type)
      .map((q) => ({
        id: q.id,
        reference: q.reference,
        norme: q.norme,
        procede: q.procede,
        dateObtention: q.dateObtention,
        dateExpiration: q.dateExpiration,
        statutAffiche: statutQualification(q),
      }));

  const resultat: IntervenantAffaire[] = [];
  for (const [personnelId, info] of soudeursParPersonne) {
    resultat.push({
      personnelId,
      nom: info.nom,
      prenom: info.prenom,
      role: "SOUDEUR",
      methodes: [],
      qualifications: qualificationsAffichees(personnelId, "SOUDAGE"),
      acuiteVisuelle: null,
    });
  }
  for (const [personnelId, info] of cndParPersonne) {
    const acuite = acuiteParPersonne.get(personnelId);
    resultat.push({
      personnelId,
      nom: info.nom,
      prenom: info.prenom,
      role: "CONTROLEUR_CND",
      methodes: [...info.methodes].sort(),
      qualifications: qualificationsAffichees(personnelId, "CND"),
      acuiteVisuelle: acuite
        ? {
            dateTest: acuite.dateTest,
            dateExpiration: acuite.dateExpiration,
            apte: acuite.apte,
            statutAffiche: calculerStatut(acuite.dateExpiration),
          }
        : null,
    });
  }

  return resultat;
}
