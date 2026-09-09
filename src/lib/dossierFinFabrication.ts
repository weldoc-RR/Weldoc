import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";
import { calculerAvancementAffaire, type AvancementAffaire } from "@/lib/avancement";
import { pointsBloquants } from "@/lib/dossierReglementaire";
import { traitementFNC, type TraitementFNC } from "@/lib/remiseEnConformite";

// Compilation du rapport de fin de fabrication (voir cahier des charges,
// "RAPPORT DE FIN DE FABRICATION") : rassemble ce qui existe déjà dans
// l'application pour une affaire (rien n'est ressaisi), et signale ce qui
// manque encore. Une vraie mise en page d'export sera affinée plus tard, à
// partir d'un exemple réel fourni par l'entreprise (voir le cahier des
// charges) — cette première version compile et affiche, en s'appuyant sur
// une page imprimable.

export interface PersonneIntervenante {
  id: string;
  nom: string;
  prenom: string;
  roles: string[];
  qualificationsExpirees: number;
  qualificationsSuspendues: number;
}

export interface ElementManquant {
  gravite: "SIGNALEMENT" | "BLOQUANT";
  texte: string;
}

export interface DossierFinFabrication {
  affaire: {
    id: string;
    numero: string;
    client: string;
    projet: string;
    typeRealisation: string;
    chantier: string | null;
    site: string | null;
    dateDebut: Date | null;
    dateFin: Date | null;
    referentiels: string[];
  };
  organigramme: {
    responsable: { nom: string; prenom: string } | null;
    chargeAffaires: { nom: string; prenom: string } | null;
    coordinateurSoudage: { nom: string; prenom: string } | null;
  };
  avancement: AvancementAffaire;
  joints: {
    id: string;
    numeroAffiche: string;
    indiceReparation: number;
    typeJoint: string | null;
    soudeur: string | null;
    wpsReference: string | null;
    resultats: { methode: string; resultat: string }[];
  }[];
  personnelIntervenant: PersonneIntervenante[];
  wpsUtilises: { reference: string; version: string }[];
  qmosUtilises: { reference: string; version: string }[];
  consommablesUtilises: { type: string; fabricant: string; reference: string; lot: string }[];
  fncs: {
    id: string;
    reference: string;
    description: string;
    impact: string;
    statut: string;
    dateCreation: Date;
    jointNumero: string | null;
    traitement: TraitementFNC;
  }[];
  elementsManquants: ElementManquant[];
  photosCount: number;
  pointsReglementairesCount: number;
  // Points réglementaires actuellement BLOQUANT (voir
  // src/lib/dossierReglementaire.ts) : tant que cette liste n'est pas
  // vide, POST /api/affaires/[id]/rapport-fin-fabrication refuse la
  // validation — utilisé ici pour ne même pas proposer de signer.
  pointsReglementairesBloquants: { id: string; intitule: string }[];
  validation: { personnel: { nom: string; prenom: string }; dateSignature: Date } | null;
  // Structure propre au rapport de fin d'intervention (RFI) — voir le
  // modèle réel fourni par l'entreprise (src/lib/dossierReglementaire.ts
  // reste pour le blocage réglementaire, distinct de ceci).
  rfi: {
    bilanIntervention: {
      entiteEmettrice: string | null;
      referenceOffreService: string | null;
      accessibilite: string | null;
      definitionIntervention: string | null;
      rexPosesDeposes: string | null;
      ecartsTravauxPrevusRealises: string | null;
      conformiteTravaux: string | null;
      bilanActionsRadioprotection: string | null;
      analyseEcartsRadioprotectionAmelioration: string | null;
      bonnesPratiques: string | null;
      dysfonctionnements: string | null;
      mesuresCorrectivesSuivantes: string | null;
    } | null;
    diffusions: { portee: string; nom: string; organisme: string | null }[];
    revisions: {
      indice: string;
      date: Date;
      natureEvolutions: string;
      redacteurs: string | null;
      verificateurs: string | null;
      approbateurs: string | null;
    }[];
    perimetresTravaux: { intervenant: string; description: string }[];
    chronologie: { date: Date; description: string }[];
    piecesRemplacees: { designation: string; nuance: string | null; fournisseur: string }[];
    bilanDosimetrique: {
      edpiMsv: number | null;
      edpoMsv: number | null;
      realiseMsv: number | null;
      deltaMsv: number | null;
      alea: string | null;
    } | null;
    portiquesRadioprotection: { categorie: string; nombre: number; localisation: string | null; observations: string | null }[];
  };
}

export async function compilerDossierFinFabrication(affaireId: string): Promise<DossierFinFabrication | null> {
  const affaire = await prisma.affaire.findUnique({
    where: { id: affaireId },
    include: { referentiels: { include: { referentiel: { select: { code: true } } } } },
  });
  if (!affaire) return null;

  const idsRoles = [affaire.responsableId, affaire.chargeAffairesId, affaire.coordinateurSoudageId].filter(
    (id): id is string => Boolean(id)
  );

  const [
    personnesRoles,
    joints,
    fncs,
    validation,
    photosCount,
    pointsReglementairesCount,
    bloquants,
    bilanIntervention,
    diffusions,
    revisions,
    perimetresTravaux,
    chronologie,
    matieres,
    bilanDosimetrique,
    portiquesRadioprotection,
  ] = await Promise.all([
    prisma.personnel.findMany({ where: { id: { in: idsRoles } }, select: { id: true, nom: true, prenom: true } }),
    prisma.joint.findMany({
      where: { affaireId },
      include: {
        soudeur: { include: { qualifications: { where: { type: "SOUDAGE" } } } },
        wps: { select: { reference: true, version: true } },
        qmos: { select: { reference: true, version: true } },
        controlesVisuels: { include: { controleur: { select: { id: true, nom: true, prenom: true } } } },
        controlesRessuage: {
          include: {
            controleur: { select: { id: true, nom: true, prenom: true } },
            consommables: { include: { consommable: true } },
          },
        },
        controlesMagnetoscopie: {
          include: {
            controleur: { select: { id: true, nom: true, prenom: true } },
            consommables: { include: { consommable: true } },
          },
        },
        controlesRadiographie: {
          include: {
            controleur: { select: { id: true, nom: true, prenom: true } },
            consommables: { include: { consommable: true } },
          },
        },
        controlesUltrasons: {
          include: {
            controleur: { select: { id: true, nom: true, prenom: true } },
            consommables: { include: { consommable: true } },
          },
        },
        controlesDim: true,
      },
      orderBy: [{ numero: "asc" }, { indiceReparation: "asc" }],
    }),
    prisma.fNC.findMany({
      where: { affaireId },
      include: { joint: { select: { numero: true } }, actionCorrectiveJoint: { select: { typeAction: true } } },
      orderBy: { dateCreation: "desc" },
    }),
    prisma.signature.findFirst({
      where: { documentType: "RAPPORT_FIN_FABRICATION", documentId: affaireId },
      orderBy: { dateSignature: "desc" },
      include: { personnel: { select: { nom: true, prenom: true } } },
    }),
    prisma.photo.count({ where: { affaireId } }),
    prisma.pointReglementaire.count({ where: { affaireId } }),
    pointsBloquants(affaireId),
    prisma.bilanIntervention.findUnique({ where: { affaireId } }),
    prisma.diffusionRFI.findMany({ where: { affaireId }, orderBy: { nom: "asc" } }),
    prisma.revisionRFI.findMany({ where: { affaireId }, orderBy: { date: "desc" } }),
    prisma.perimetreTravaux.findMany({ where: { affaireId }, orderBy: { ordre: "asc" } }),
    prisma.evenementChronologie.findMany({ where: { affaireId }, orderBy: { date: "asc" } }),
    prisma.matiere.findMany({ where: { affaireId }, select: { designation: true, nuance: true, fournisseur: true } }),
    prisma.bilanDosimetrique.findUnique({ where: { affaireId } }),
    prisma.portiqueRadioprotection.findMany({ where: { affaireId }, orderBy: { categorie: "asc" } }),
  ]);

  const avancement = await calculerAvancementAffaire(affaireId);

  const trouverRole = (id: string | null) => personnesRoles.find((p) => p.id === id) ?? null;

  // Personnel intervenant : soudeurs (joints.soudeurId) + contrôleurs (tous
  // types de contrôle confondus), avec le nombre de leurs qualifications
  // soudage actuellement expirées/suspendues — un signalement, jamais un
  // blocage (voir src/lib/verificationQS.ts, même logique).
  const roles = new Map<string, Set<string>>();
  function ajouterRole(personnel: { id: string } | null | undefined, role: string) {
    if (!personnel) return;
    const ensemble = roles.get(personnel.id) ?? new Set<string>();
    ensemble.add(role);
    roles.set(personnel.id, ensemble);
  }
  for (const j of joints) {
    ajouterRole(j.soudeur, "soudeur");
    for (const c of j.controlesVisuels) ajouterRole(c.controleur, "contrôleur VT");
    for (const c of j.controlesRessuage) ajouterRole(c.controleur, "contrôleur PT");
    for (const c of j.controlesMagnetoscopie) ajouterRole(c.controleur, "contrôleur MT");
    for (const c of j.controlesRadiographie) ajouterRole(c.controleur, "contrôleur RT");
    for (const c of j.controlesUltrasons) ajouterRole(c.controleur, "contrôleur UT");
  }
  const idsIntervenants = [...roles.keys()];
  const intervenants = idsIntervenants.length
    ? await prisma.personnel.findMany({
        where: { id: { in: idsIntervenants } },
        include: { qualifications: { where: { type: "SOUDAGE" } } },
      })
    : [];
  const personnelIntervenant: PersonneIntervenante[] = intervenants.map((p) => {
    const qualificationsExpirees = p.qualifications.filter(
      (q) => calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }) === "EXPIRE"
    ).length;
    const qualificationsSuspendues = p.qualifications.filter((q) => q.statut === "SUSPENDU").length;
    return {
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      roles: [...(roles.get(p.id) ?? [])].sort(),
      qualificationsExpirees,
      qualificationsSuspendues,
    };
  });

  const wpsUtilises = new Map<string, { reference: string; version: string }>();
  const qmosUtilises = new Map<string, { reference: string; version: string }>();
  const consommablesUtilises = new Map<string, { type: string; fabricant: string; reference: string; lot: string }>();

  const jointsCompiles = joints.map((j) => {
    if (j.wps) wpsUtilises.set(`${j.wps.reference}::${j.wps.version}`, j.wps);
    if (j.qmos) qmosUtilises.set(`${j.qmos.reference}::${j.qmos.version}`, j.qmos);
    for (const c of [...j.controlesRessuage, ...j.controlesMagnetoscopie, ...j.controlesRadiographie, ...j.controlesUltrasons]) {
      for (const u of c.consommables) {
        consommablesUtilises.set(u.consommable.id, u.consommable);
      }
    }

    const dernier = <T extends { dateControle: Date; resultat: string }>(controles: T[]) =>
      controles.length === 0
        ? null
        : [...controles].sort((a, b) => b.dateControle.getTime() - a.dateControle.getTime())[0].resultat;

    const resultats: { methode: string; resultat: string }[] = [];
    const dim = dernier(j.controlesDim);
    if (dim) resultats.push({ methode: "DIM", resultat: dim });
    const vt = dernier(j.controlesVisuels);
    if (vt) resultats.push({ methode: "VT", resultat: vt });
    const pt = dernier(j.controlesRessuage);
    if (pt) resultats.push({ methode: "PT", resultat: pt });
    const mt = dernier(j.controlesMagnetoscopie);
    if (mt) resultats.push({ methode: "MT", resultat: mt });
    const rt = dernier(j.controlesRadiographie);
    if (rt) resultats.push({ methode: "RT", resultat: rt });
    const ut = dernier(j.controlesUltrasons);
    if (ut) resultats.push({ methode: "UT", resultat: ut });

    return {
      id: j.id,
      numeroAffiche: j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero,
      indiceReparation: j.indiceReparation,
      typeJoint: j.typeJoint,
      soudeur: j.soudeur ? `${j.soudeur.prenom} ${j.soudeur.nom}` : null,
      wpsReference: j.wps ? `${j.wps.reference} (${j.wps.version})` : j.wpsReference,
      resultats,
      // conservés pour le calcul des éléments manquants ci-dessous
      _indiceReparation: j.indiceReparation,
      _aucunControleVisuel: j.controlesVisuels.length === 0,
    };
  });

  const elementsManquants: ElementManquant[] = [];
  for (const j of jointsCompiles) {
    if (j._indiceReparation === 0 && j._aucunControleVisuel) {
      elementsManquants.push({ gravite: "SIGNALEMENT", texte: `Joint ${j.numeroAffiche} : aucun contrôle visuel enregistré.` });
    }
  }
  const fncOuvertes = fncs.filter((f) => f.statut !== "CLOTUREE");
  for (const f of fncOuvertes) {
    elementsManquants.push({
      gravite: "BLOQUANT",
      texte: `FNC ${f.reference} non clôturée (statut ${f.statut}).`,
    });
  }
  for (const point of bloquants) {
    elementsManquants.push({
      gravite: "BLOQUANT",
      texte: `Point réglementaire bloquant : ${point.intitule}.`,
    });
  }
  for (const p of personnelIntervenant) {
    if (p.qualificationsExpirees > 0) {
      elementsManquants.push({
        gravite: "SIGNALEMENT",
        texte: `${p.prenom} ${p.nom} : ${p.qualificationsExpirees} qualification(s) soudage expirée(s).`,
      });
    }
    if (p.qualificationsSuspendues > 0) {
      elementsManquants.push({
        gravite: "BLOQUANT",
        texte: `${p.prenom} ${p.nom} : ${p.qualificationsSuspendues} qualification(s) soudage suspendue(s).`,
      });
    }
  }

  return {
    affaire: {
      id: affaire.id,
      numero: affaire.numero,
      client: affaire.client,
      projet: affaire.projet,
      typeRealisation: affaire.typeRealisation,
      chantier: affaire.chantier,
      site: affaire.site,
      dateDebut: affaire.dateDebut,
      dateFin: affaire.dateFin,
      referentiels: affaire.referentiels.map((r) => r.referentiel.code),
    },
    organigramme: {
      responsable: trouverRole(affaire.responsableId),
      chargeAffaires: trouverRole(affaire.chargeAffairesId),
      coordinateurSoudage: trouverRole(affaire.coordinateurSoudageId),
    },
    avancement,
    joints: jointsCompiles.map(({ _indiceReparation, _aucunControleVisuel, ...j }) => j),
    personnelIntervenant,
    wpsUtilises: [...wpsUtilises.values()],
    qmosUtilises: [...qmosUtilises.values()],
    consommablesUtilises: [...consommablesUtilises.values()],
    fncs: fncs.map((f) => ({
      id: f.id,
      reference: f.reference,
      description: f.description,
      impact: f.impact,
      statut: f.statut,
      dateCreation: f.dateCreation,
      jointNumero: f.joint?.numero ?? null,
      traitement: traitementFNC({
        statut: f.statut,
        actionCorrectiveJointId: f.actionCorrectiveJointId,
        actionCorrectiveJointTypeAction: f.actionCorrectiveJoint?.typeAction ?? null,
      }),
    })),
    elementsManquants,
    photosCount,
    pointsReglementairesCount,
    pointsReglementairesBloquants: bloquants,
    rfi: {
      bilanIntervention,
      diffusions: diffusions.map((d) => ({ portee: d.portee, nom: d.nom, organisme: d.organisme })),
      revisions: revisions.map((r) => ({
        indice: r.indice,
        date: r.date,
        natureEvolutions: r.natureEvolutions,
        redacteurs: r.redacteurs,
        verificateurs: r.verificateurs,
        approbateurs: r.approbateurs,
      })),
      perimetresTravaux: perimetresTravaux.map((p) => ({ intervenant: p.intervenant, description: p.description })),
      chronologie: chronologie.map((c) => ({ date: c.date, description: c.description })),
      piecesRemplacees: matieres,
      bilanDosimetrique,
      portiquesRadioprotection: portiquesRadioprotection.map((p) => ({
        categorie: p.categorie,
        nombre: p.nombre,
        localisation: p.localisation,
        observations: p.observations,
      })),
    },
    validation: validation ? { personnel: validation.personnel, dateSignature: validation.dateSignature } : null,
  };
}
