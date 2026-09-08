import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NiveauDecision } from "@prisma/client";

export const SESSION_COOKIE_NAME = "weldoc_session";
const SESSION_DUREE_MS = 12 * 60 * 60 * 1000; // 12h : la durée d'un poste, ajustable.

const ORDRE_NIVEAU: Record<NiveauDecision, number> = {
  NIVEAU_1: 1,
  NIVEAU_2: 2,
  NIVEAU_3: 3,
};

export function aNiveauMinimum(niveau: NiveauDecision, minimum: NiveauDecision): boolean {
  return ORDRE_NIVEAU[niveau] >= ORDRE_NIVEAU[minimum];
}

export async function hashMotDePasse(motDePasse: string): Promise<string> {
  return bcrypt.hash(motDePasse, 12);
}

export async function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, hash);
}

function genererJeton(): string {
  return randomBytes(32).toString("base64url");
}

// On ne stocke jamais le jeton en clair en base : seul son empreinte (sha256)
// est conservée, comme pour un mot de passe. Le jeton en clair ne vit que
// dans le cookie du navigateur.
function empreinteJeton(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

export async function creerSession(compteId: string) {
  const jeton = genererJeton();
  const expireLe = new Date(Date.now() + SESSION_DUREE_MS);

  await prisma.session.create({
    data: { compteId, tokenHash: empreinteJeton(jeton), expireLe },
  });

  return { jeton, expireLe };
}

export async function revoquerSession(jeton: string) {
  await prisma.session.updateMany({
    where: { tokenHash: empreinteJeton(jeton), revoqueLe: null },
    data: { revoqueLe: new Date() },
  });
}

export type UtilisateurConnecte = {
  personnelId: string;
  compteId: string;
  matricule: string;
  nom: string;
  prenom: string;
  niveau: NiveauDecision;
};

// Vérifie à chaque appel que la session n'est ni expirée ni révoquée et que
// le compte est toujours actif (une suspension prend donc effet immédiatement).
async function utilisateurDepuisJeton(jeton: string | undefined): Promise<UtilisateurConnecte | null> {
  if (!jeton) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: empreinteJeton(jeton) },
    include: { compte: { include: { personnel: true } } },
  });

  if (!session) return null;
  if (session.revoqueLe) return null;
  if (session.expireLe < new Date()) return null;
  if (session.compte.statut !== "ACTIF") return null;

  const { compte } = session;
  const { personnel } = compte;

  return {
    personnelId: personnel.id,
    compteId: compte.id,
    matricule: personnel.matricule,
    nom: personnel.nom,
    prenom: personnel.prenom,
    niveau: personnel.niveau,
  };
}

// Pour un Route Handler (accès au cookie via NextRequest).
export async function getUtilisateurConnecte(req: NextRequest): Promise<UtilisateurConnecte | null> {
  return utilisateurDepuisJeton(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}

// Pour un Server Component (accès au cookie via next/headers).
export async function getUtilisateurConnecteServeur(): Promise<UtilisateurConnecte | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return utilisateurDepuisJeton(store.get(SESSION_COOKIE_NAME)?.value);
}

// Petits raccourcis pour protéger un handler d'API : retournent une réponse
// d'erreur prête à l'emploi, ou l'utilisateur si les droits sont suffisants.
export async function requireAuth(
  req: NextRequest
): Promise<{ utilisateur: UtilisateurConnecte } | { erreur: NextResponse }> {
  const utilisateur = await getUtilisateurConnecte(req);
  if (!utilisateur) {
    return { erreur: NextResponse.json({ error: "Authentification requise." }, { status: 401 }) };
  }
  return { utilisateur };
}

export async function requireNiveau(
  req: NextRequest,
  minimum: NiveauDecision
): Promise<{ utilisateur: UtilisateurConnecte } | { erreur: NextResponse }> {
  const result = await requireAuth(req);
  if ("erreur" in result) return result;

  if (!aNiveauMinimum(result.utilisateur.niveau, minimum)) {
    return {
      erreur: NextResponse.json(
        { error: `Droits insuffisants : niveau ${minimum} minimum requis.` },
        { status: 403 }
      ),
    };
  }
  return result;
}
