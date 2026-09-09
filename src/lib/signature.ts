import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Signature } from "@prisma/client";
import { personneAutoriseeASigner } from "@/lib/autorisationsSignature";

// Un code PIN se hache exactement comme un mot de passe (voir
// src/lib/auth.ts) — jamais stocké en clair.
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifierPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export type ResultatSignature =
  | { ok: true; signature: Signature; personnel: { id: string; nom: string; prenom: string } }
  | { ok: false; statut: number; erreur: string };

type PersonneIdentifiee = { id: string; nom: string; prenom: string };
type ResultatIdentification =
  | { ok: true; personnel: PersonneIdentifiee }
  | { ok: false; statut: number; erreur: string };

// Identification (QR ou matricule) → authentification (PIN) → contrôle que
// la charte en vigueur a été acceptée → contrôle des droits pour ce type de
// document, exactement le parcours demandé au cahier des charges
// ("IDENTIFICATION ET SIGNATURE"), mais sans encore créer de signature :
// extrait pour être partagé entre `creerSignature` (une signature) et
// `signerPlusieursDocuments` (plusieurs documents signés en une seule
// identification, ex. plusieurs phases cochées en même temps).
async function identifierPourSigner(identifiant: string, pin: string, documentType: string): Promise<ResultatIdentification> {
  const personnel = await prisma.personnel.findFirst({
    where: { OR: [{ matricule: identifiant }, { qrCodeValeur: identifiant }] },
  });
  if (!personnel) {
    return { ok: false, statut: 404, erreur: "Personne introuvable (matricule ou QR non reconnu)." };
  }

  if (!personnel.pinHash) {
    return { ok: false, statut: 422, erreur: `${personnel.prenom} ${personnel.nom} n'a pas encore défini de code PIN.` };
  }
  if (!(await verifierPin(pin, personnel.pinHash))) {
    return { ok: false, statut: 401, erreur: "Code PIN incorrect." };
  }

  const derniereCharte = await prisma.chartVersion.findFirst({ orderBy: { publieLe: "desc" } });
  if (derniereCharte) {
    const acceptation = await prisma.chartAcceptation.findUnique({
      where: { personnelId_chartVersionId: { personnelId: personnel.id, chartVersionId: derniereCharte.id } },
    });
    if (!acceptation) {
      return {
        ok: false,
        statut: 422,
        erreur: `${personnel.prenom} ${personnel.nom} doit d'abord accepter la charte d'utilisation en vigueur (version ${derniereCharte.version}).`,
      };
    }
  }

  // "Contrôle des droits" (voir le cahier des charges, "IDENTIFICATION ET
  // SIGNATURE") : au-delà du niveau déjà vérifié par la route appelante,
  // si des autorisations de signature nominatives existent pour ce type
  // de document, seules les personnes autorisées peuvent signer.
  if (!(await personneAutoriseeASigner(personnel.id, documentType))) {
    return {
      ok: false,
      statut: 403,
      erreur: `${personnel.prenom} ${personnel.nom} n'est pas autorisé(e) à signer ce type de document (${documentType}).`,
    };
  }

  return { ok: true, personnel: { id: personnel.id, nom: personnel.nom, prenom: personnel.prenom } };
}

// Parcours complet demandé au cahier des charges ("Identification et
// signature") : identification (QR ou matricule) → authentification (PIN)
// → contrôle que la charte en vigueur a été acceptée → signature
// horodatée. Extrait de POST /api/signatures pour être réutilisé par les
// validations qui doivent créer la signature elles-mêmes APRÈS avoir
// vérifié leurs propres conditions (ex. absence de point réglementaire
// bloquant) — pour qu'une signature ne puisse jamais exister sans que la
// validation ait réellement abouti (voir POST
// /api/affaires/[id]/rapport-fin-fabrication).
export async function creerSignature(donnees: {
  identifiant: string;
  pin: string;
  documentType: string;
  documentId: string;
  versionDocument: string;
}): Promise<ResultatSignature> {
  const identification = await identifierPourSigner(donnees.identifiant, donnees.pin, donnees.documentType);
  if (!identification.ok) return identification;

  const signature = await prisma.signature.create({
    data: {
      personnelId: identification.personnel.id,
      documentType: donnees.documentType,
      documentId: donnees.documentId,
      versionDocument: donnees.versionDocument,
    },
  });

  return { ok: true, signature, personnel: identification.personnel };
}

export type ResultatSignaturesMultiples =
  | { ok: true; signatures: Signature[]; personnel: PersonneIdentifiee }
  | { ok: false; statut: number; erreur: string };

// Signe plusieurs documents du même type en une seule identification (une
// seule saisie de PIN) : ex. l'exécutant coche les phases qu'il vient de
// réaliser puis s'identifie une fois — voir POST /api/phases/signer. Crée
// une ligne Signature par document (jamais une signature partagée entre
// plusieurs documentId, pour rester cohérent avec le reste de
// l'application qui suppose une signature = un document), mais le PIN
// n'est vérifié qu'une fois pour tous. Comme pour `creerSignature`, les
// conditions propres à chaque document (ex. séquencement, points
// réglementaires bloquants) doivent être vérifiées par l'appelant AVANT
// d'appeler cette fonction, pour qu'aucune signature ne puisse exister
// sans que la validation ait réellement abouti.
export async function signerPlusieursDocuments(donnees: {
  identifiant: string;
  pin: string;
  documentType: string;
  documentIds: string[];
  versionDocument: string;
}): Promise<ResultatSignaturesMultiples> {
  const identification = await identifierPourSigner(donnees.identifiant, donnees.pin, donnees.documentType);
  if (!identification.ok) return identification;

  const signatures: Signature[] = [];
  for (const documentId of donnees.documentIds) {
    const signature = await prisma.signature.create({
      data: {
        personnelId: identification.personnel.id,
        documentType: donnees.documentType,
        documentId,
        versionDocument: donnees.versionDocument,
      },
    });
    signatures.push(signature);
  }

  return { ok: true, signatures, personnel: identification.personnel };
}
