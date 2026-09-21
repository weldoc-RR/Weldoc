import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { identifierPourSigner } from "@/lib/signature";
import { estPreparateur } from "@/lib/verificationRole";

const ValiderSchema = z.object({ identifiant: z.string().min(1), pin: z.string().min(1) });

// GET /api/affaires/[id]/valider-fiche-activite — dernière validation
// enregistrée pour cette fiche de suivi d'activité (aucun enregistrement
// dédié : la signature elle-même EST la trace, comme pour la validation
// du rapport de fin de fabrication), ou null si elle n'a encore jamais
// été validée.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const validation = await prisma.signature.findFirst({
    where: { documentType: "FICHE_ACTIVITE", documentId: params.id },
    orderBy: { dateSignature: "desc" },
    include: { personnel: { select: { nom: true, prenom: true } } },
  });
  return NextResponse.json(validation);
}

// POST /api/affaires/[id]/valider-fiche-activite — valide la fiche de
// suivi d'activité : réservé à la personne qui signe (identification QR/
// matricule + PIN — potentiellement différente de celle connectée sur une
// tablette partagée) tenant la fonction "Préparateur" (voir
// src/lib/verificationRole.ts — ici une condition d'accès réelle, pas
// seulement indicative, comme demandé par l'entreprise pour cette action
// précise). Le contrôle du rôle se fait AVANT de créer la signature, pour
// qu'une signature de validation ne puisse jamais exister sans que cette
// condition ait réellement été respectée (même principe que la validation
// du rapport de fin de fabrication). Une fois validée, le séquencement des
// phases (ajout/suppression) se verrouille — voir POST/DELETE
// /api/phases — pour que le document reste stable une fois passé en
// production : la préparation elle-même n'est jamais modifiée après
// coup, seule une nouvelle révision (indice) documenterait un changement.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const dejaValidee = await prisma.signature.findFirst({
    where: { documentType: "FICHE_ACTIVITE", documentId: params.id },
  });
  if (dejaValidee) {
    return NextResponse.json({ error: "Cette fiche est déjà validée." }, { status: 409 });
  }

  const body = await req.json();
  const parsed = ValiderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { identifiant, pin } = parsed.data;

  const identification = await identifierPourSigner(identifiant, pin, "FICHE_ACTIVITE");
  if (!identification.ok) {
    return NextResponse.json({ error: identification.erreur }, { status: identification.statut });
  }

  const fonctions = await prisma.personnelFonction.findMany({
    where: { personnelId: identification.personnel.id },
    select: { fonction: true },
  });
  if (!estPreparateur(fonctions.map((f) => f.fonction))) {
    return NextResponse.json(
      { error: `${identification.personnel.prenom} ${identification.personnel.nom} n'a pas la fonction "Préparateur" requise pour valider cette fiche.` },
      { status: 403 }
    );
  }

  const signature = await prisma.signature.create({
    data: {
      personnelId: identification.personnel.id,
      documentType: "FICHE_ACTIVITE",
      documentId: params.id,
      versionDocument: new Date().toISOString().slice(0, 10),
    },
  });

  return NextResponse.json({ ok: true, validation: signature, personnel: identification.personnel }, { status: 201 });
}
