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
// expirées ou suspendues), est bloquée. Ce contrôle ne vérifie pas que la
// qualification couvre précisément la méthode/le procédé demandé (voir
// src/lib/verificationQS.ts pour cette correspondance fine, réservée au
// soudage) : il vérifie seulement qu'il en existe au moins une valide, ce
// qui reste la seule chose que Weldoc puisse constater sans interpréter un
// référentiel qu'il ne reproduit pas (voir l'avertissement sur les normes
// protégées).
export async function verifierQualificationBloquante(
  personnelId: string,
  type: "SOUDAGE" | "CND"
): Promise<BlocageAptitude> {
  const qualifications = await prisma.qualification.findMany({ where: { personnelId, type } });
  if (qualifications.length === 0) return { bloque: false };

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

// Droits contextuels — "contexte de l'affaire" (voir le cahier des
// charges, "DROITS ET MODIFICATIONS" : "droits définis par... le contexte
// de l'affaire") : pour souder un joint ou réaliser un contrôle CND,
// encore fallait-il jusqu'ici être authentifié, sans être réellement
// affecté à CETTE affaire dans le planning (voir Affectation, déjà
// utilisé pour l'organigramme et les alertes de disponibilité).
//
// Même principe additif que les autres blocages : si aucune affectation
// (autre qu'annulée) n'existe pour l'affaire, rien n'est vérifiable, donc
// rien n'est bloqué — le comportement actuel continue. Si l'affaire a des
// affectations mais que cette personne n'en a aucune, l'action est
// bloquée. Niveau 3 (validation critique, décisions définies par
// l'entreprise — voir le cahier des charges) passe toujours, comme pour
// le déblocage réglementaire.
export async function verifierAffectationBloquante(personnelId: string, affaireId: string): Promise<BlocageAptitude> {
  const personnel = await prisma.personnel.findUnique({ where: { id: personnelId }, select: { niveau: true } });
  if (personnel?.niveau === "NIVEAU_3") return { bloque: false };

  const affectationsAffaire = await prisma.affectation.findMany({
    where: { affaireId, statut: { not: "ANNULEE" } },
    select: { personnelId: true },
  });
  if (affectationsAffaire.length === 0) return { bloque: false };

  const estAffecte = affectationsAffaire.some((a) => a.personnelId === personnelId);
  if (estAffecte) return { bloque: false };

  return {
    bloque: true,
    motif: "Cette personne n'est pas affectée à cette affaire (voir le planning) — action bloquée.",
  };
}

// Les vérifications requises avant un contrôle CND (VT/PT/MT/RT/UT) :
// qualification CND, acuité visuelle, et être affecté à l'affaire.
// Utilisé par les cinq routes de contrôle CND pour éviter de dupliquer
// cet enchaînement cinq fois.
export async function verifierAptitudeCND(personnelId: string, affaireId: string): Promise<BlocageAptitude> {
  const qualif = await verifierQualificationBloquante(personnelId, "CND");
  if (qualif.bloque) return qualif;
  const acuite = await verifierAcuiteVisuelleBloquante(personnelId);
  if (acuite.bloque) return acuite;
  return verifierAffectationBloquante(personnelId, affaireId);
}
