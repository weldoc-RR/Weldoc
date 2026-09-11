import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { pointsBloquants } from "@/lib/dossierReglementaire";
import { creerSignature } from "@/lib/signature";

const ValiderSchema = z.object({ identifiant: z.string().min(1), pin: z.string().min(1) });

// GET /api/affaires/[id]/rapport-fin-fabrication — dernière validation
// enregistrée pour cette affaire (aucun enregistrement dédié : la
// signature elle-même EST la trace), ou null si le rapport n'a encore
// jamais été validé. Comme la signature n'est créée que par POST
// ci-dessous (jamais par POST /api/signatures directement pour ce
// documentType), son existence suffit à prouver que la validation a
// réellement abouti — voir POST ci-dessous.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const validation = await prisma.signature.findFirst({
    where: { documentType: "RAPPORT_FIN_FABRICATION", documentId: params.id },
    orderBy: { dateSignature: "desc" },
    include: { personnel: { select: { nom: true, prenom: true } } },
  });
  return NextResponse.json(validation);
}

// POST /api/affaires/[id]/rapport-fin-fabrication — valide le rapport de
// fin de fabrication (voir cahier des charges, "signé par une personne
// habilitée") : réservé au niveau 3 (session connectée), et refusé tant
// qu'un point du dossier réglementaire (voir
// src/lib/dossierReglementaire.ts) reste BLOQUANT pour cette affaire —
// "un point bloquant empêche la poursuite de la partie concernée", ici la
// validation finale. La signature (identification QR/matricule + PIN,
// voir src/lib/signature.ts) n'est créée qu'APRÈS ces deux vérifications,
// jamais avant : contrairement aux autres signatures de l'application
// (créées via POST /api/signatures puis simplement référencées), celle-ci
// est la seule preuve persistée de la validation — elle ne doit donc
// jamais pouvoir exister sans qu'une validation ait réellement abouti.
// Weldoc ne se substitue jamais à cette décision humaine et tracée, ni à
// un organisme réglementaire ou une certification externe.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const bloquants = await pointsBloquants(params.id);
  if (bloquants.length > 0) {
    return NextResponse.json(
      { error: `Point(s) réglementaire(s) bloquant(s) : ${bloquants.map((p) => p.intitule).join(", ")}.` },
      { status: 422 }
    );
  }

  const body = await req.json();
  const parsed = ValiderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const resultat = await creerSignature({
    identifiant: parsed.data.identifiant,
    pin: parsed.data.pin,
    documentType: "RAPPORT_FIN_FABRICATION",
    documentId: params.id,
    versionDocument: new Date().toISOString().slice(0, 10),
  });
  if (!resultat.ok) {
    return NextResponse.json({ error: resultat.erreur }, { status: resultat.statut });
  }

  return NextResponse.json({ ok: true, validation: resultat.signature, personnel: resultat.personnel }, { status: 201 });
}
