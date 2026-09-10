import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";

export type BlocageAptitude = { bloque: boolean; motif?: string };

// Vérification bloquante de la qualification d'une personne (voir le
// cahier des charges : Weldoc doit "détecter" une qualification expirée et
// "bloquer l'intervenant" — jusqu'ici seul un signalement existait, sur
// /alertes, pour une qualification "bientôt à échéance" ou déjà expirée).
//
// Comportement volontairement additif, comme les autres vérifications du
// même genre (MatierePrevue, ControlesRequis) : une personne qui n'a
// AUCUNE qualification de ce type enregistrée n'est jamais bloquée (rien à
// vérifier) — seule une personne qui a déjà eu au moins une qualification
// de ce type, mais dont plus aucune n'est valide aujourd'hui (toutes
// expirées ou suspendues), est bloquée.
//
// Exception : sur une affaire qui exige explicitement une qualification au
// dossier (`Affaire.qualificationSurDossierObligatoire`, voir le cahier
// des charges "DROITS ET MODIFICATIONS"), une personne sans AUCUNE
// qualification enregistrée est elle aussi bloquée — sur les affaires qui
// n'activent pas cette exigence, le comportement additif habituel
// continue.
//
// Ce contrôle ne vérifie pas que la qualification couvre précisément la
// méthode/le procédé demandé (voir src/lib/verificationQS.ts pour cette
// correspondance fine, réservée au soudage) : il vérifie seulement qu'il
// en existe au moins une valide, ce qui reste la seule chose que Weldoc
// puisse constater sans interpréter un référentiel qu'il ne reproduit pas
// (voir l'avertissement sur les normes protégées).
export async function verifierQualificationBloquante(
  personnelId: string,
  type: "SOUDAGE" | "CND",
  options: { qualificationObligatoire?: boolean } = {}
): Promise<BlocageAptitude> {
  const qualifications = await prisma.qualification.findMany({ where: { personnelId, type } });

  if (qualifications.length === 0) {
    if (options.qualificationObligatoire) {
      return {
        bloque: true,
        motif:
          `Aucune qualification ${type === "SOUDAGE" ? "soudage" : "CND"} enregistrée pour cette personne, ` +
          "et cette affaire exige une qualification au dossier — action bloquée, voir sa fiche personnel.",
      };
    }
    return { bloque: false };
  }

  const auMoinsUneValide = qualifications.some((q) => {
    const statut = calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" });
    return statut !== "EXPIRE" && statut !== "SUSPENDU";
  });
  if (auMoinsUneValide) return { bloque: false };

  return {
    bloque: true,
    motif:
      `Aucune qualification ${type === "SOUDAGE" ? "soudage" : "CND"} valide pour cette personne ` +
      "(qualification(s) enregistrée(s) expirée(s) ou suspendue(s)) — action bloquée, voir sa fiche personnel.",
  };
}

// Lit l'exigence "qualification au dossier obligatoire" d'une affaire
// (voir verifierQualificationBloquante ci-dessus) — factorisé pour éviter
// de dupliquer cette lecture dans chaque route qui vérifie une
// qualification.
export async function qualificationObligatoireSurAffaire(affaireId: string): Promise<boolean> {
  const affaire = await prisma.affaire.findUnique({
    where: { id: affaireId },
    select: { qualificationSurDossierObligatoire: true },
  });
  return affaire?.qualificationSurDossierObligatoire ?? false;
}

// Même principe pour l'acuité visuelle (obligatoire pour les cinq
// contrôles CND — la lecture d'indications, quelle que soit la méthode,
// suppose une vue apte à jour) : seul le dernier test enregistré compte
// (comme pour un renouvellement), une personne sans aucun test enregistré
// n'est jamais bloquée.
export async function verifierAcuiteVisuelleBloquante(personnelId: string): Promise<BlocageAptitude> {
  const acuites = await prisma.acuiteVisuelle.findMany({
    where: { personnelId },
    orderBy: { dateTest: "desc" },
  });
  if (acuites.length === 0) return { bloque: false };

  const dernier = acuites[0];
  const statut = calculerStatut(dernier.dateExpiration);
  if (dernier.apte && statut !== "EXPIRE") return { bloque: false };

  return {
    bloque: true,
    motif: "Acuité visuelle non valide pour cette personne (non apte ou test expiré) — action bloquée, voir sa fiche personnel.",
  };
}

// Même principe pour les habilitations (accès site, radioprotection,
// CACES...) : à la différence des qualifications (où plusieurs
// qualifications du même type sont des preuves alternatives — une seule
// valide suffit), chaque habilitation est une exigence indépendante des
// autres, donc TOUTES celles enregistrées pour cette personne doivent
// être valides, pas seulement une au choix. Une personne sans aucune
// habilitation enregistrée n'est jamais bloquée (rien à vérifier).
export async function verifierHabilitationsBloquantes(personnelId: string): Promise<BlocageAptitude> {
  const habilitations = await prisma.habilitation.findMany({ where: { personnelId } });
  if (habilitations.length === 0) return { bloque: false };

  const habilitationInvalide = habilitations.find((h) => {
    const statut = calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" });
    return statut === "EXPIRE" || statut === "SUSPENDU";
  });
  if (!habilitationInvalide) return { bloque: false };

  return {
    bloque: true,
    motif:
      `Habilitation "${habilitationInvalide.intitule}" expirée ou suspendue pour cette personne — ` +
      "action bloquée, voir sa fiche personnel.",
  };
}

// Droits contextuels — "contexte de l'affaire" (voir le cahier des
// charges, "DROITS ET MODIFICATIONS" : "droits définis par... le contexte
// de l'affaire") : plutôt que d'exiger une affectation planifiée à
// l'avance (ce qui bloquerait une action tant que quelqu'un n'a pas
// pensé à mettre la personne au planning), Weldoc intègre automatiquement
// la personne au planning de l'affaire au moment même où elle agit
// (souder un joint, réaliser un contrôle) — comme ça, personne n'a besoin
// d'être pré-affecté à la main, et le planning/l'organigramme d'une
// affaire reste toujours complet et à jour avec ce qui s'est réellement
// passé, sans double saisie.
//
// N'écrit rien si la personne a déjà une affectation (autre qu'annulée)
// sur cette affaire — jamais de doublon. L'affectation créée est marquée
// directement comme déjà réalisée (statut TERMINEE, même date de début et
// de fin) : ce n'est pas une planification à venir, c'est le constat
// qu'une personne a bien travaillé sur cette affaire.
export async function assurerAffectation(
  personnelId: string,
  affaireId: string,
  fonction: string,
  creeParId: string
): Promise<void> {
  const existante = await prisma.affectation.findFirst({
    where: { personnelId, affaireId, statut: { not: "ANNULEE" } },
    select: { id: true },
  });
  if (existante) return;

  const maintenant = new Date();
  await prisma.affectation.create({
    data: {
      personnelId,
      affaireId,
      fonction,
      dateDebut: maintenant,
      dateFin: maintenant,
      statut: "TERMINEE",
      creeParId,
    },
  });
}

// Les vérifications requises avant un contrôle CND (VT/PT/MT/RT/UT) :
// qualification CND, acuité visuelle et habilitations. Utilisé par les
// cinq routes de contrôle CND pour éviter de dupliquer cet enchaînement
// cinq fois.
export async function verifierAptitudeCND(personnelId: string, affaireId: string): Promise<BlocageAptitude> {
  const qualificationObligatoire = await qualificationObligatoireSurAffaire(affaireId);
  const qualif = await verifierQualificationBloquante(personnelId, "CND", { qualificationObligatoire });
  if (qualif.bloque) return qualif;
  const acuite = await verifierAcuiteVisuelleBloquante(personnelId);
  if (acuite.bloque) return acuite;
  return verifierHabilitationsBloquantes(personnelId);
}
