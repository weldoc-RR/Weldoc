import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { tracerModification } from "@/lib/auditTrail";

// GET /api/autorisations-signature?personnelId=... — autorisations de
// signature nominatives (voir le cahier des charges, fiche personne :
// "autorisations de signature") : qui a le droit de signer quel type de
// document, au-delà du niveau. Voir src/lib/autorisationsSignature.ts
// pour la façon dont c'est appliqué au moment de signer.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const autorisations = await prisma.autorisationSignature.findMany({
    where: { personnelId: personnelId ?? undefined },
    include: { accordeePar: { select: { nom: true, prenom: true } } },
    orderBy: { documentType: "asc" },
  });
  return NextResponse.json(autorisations);
}

const CreateSchema = z.object({
  personnelId: z.string().min(1),
  documentType: z.string().min(1),
});

// POST /api/autorisations-signature — accorde à une personne le droit de
// signer un type de document (réservé au niveau 3, comme les autres
// décisions de droits — voir le cahier des charges, "DROITS ET
// MODIFICATIONS"). Une autorisation déjà accordée puis révoquée n'est
// jamais recréée en double : la même ligne (contrainte
// personnelId+documentType) repasse active, tracée par l'audit trail —
// même principe que le niveau d'une personne ou le statut d'un compte.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const personnel = await prisma.personnel.findUnique({ where: { id: parsed.data.personnelId } });
  if (!personnel) {
    return NextResponse.json({ error: "Personnel introuvable." }, { status: 404 });
  }

  const existante = await prisma.autorisationSignature.findUnique({
    where: {
      personnelId_documentType: { personnelId: parsed.data.personnelId, documentType: parsed.data.documentType },
    },
  });

  const autorisation = existante
    ? await prisma.autorisationSignature.update({
        where: { id: existante.id },
        data: { active: true, accordeeParId: droits.utilisateur.personnelId },
      })
    : await prisma.autorisationSignature.create({
        data: {
          personnelId: parsed.data.personnelId,
          documentType: parsed.data.documentType,
          accordeeParId: droits.utilisateur.personnelId,
        },
      });

  if (!existante || !existante.active) {
    await tracerModification({
      utilisateurId: droits.utilisateur.personnelId,
      entite: "AutorisationSignature",
      entiteId: autorisation.id,
      ancienneValeur: existante ? { active: false } : undefined,
      nouvelleValeur: { active: true, personnelId: autorisation.personnelId, documentType: autorisation.documentType },
    });
  }

  return NextResponse.json(autorisation, { status: existante ? 200 : 201 });
}

const RevokeSchema = z.object({
  id: z.string().min(1),
});

// PATCH /api/autorisations-signature — révoque une autorisation (réservé
// au niveau 3). Ne supprime jamais la ligne : `active` repasse à false,
// tracé par l'audit trail.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = RevokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const avant = await prisma.autorisationSignature.findUnique({ where: { id: parsed.data.id } });
  if (!avant) {
    return NextResponse.json({ error: "Autorisation introuvable." }, { status: 404 });
  }

  const autorisation = await prisma.autorisationSignature.update({
    where: { id: avant.id },
    data: { active: false },
  });

  if (avant.active) {
    await tracerModification({
      utilisateurId: droits.utilisateur.personnelId,
      entite: "AutorisationSignature",
      entiteId: autorisation.id,
      ancienneValeur: { active: true },
      nouvelleValeur: { active: false },
    });
  }

  return NextResponse.json(autorisation);
}
