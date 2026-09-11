import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { IndicationSchema, ConditionsExamenSchema, calculerResultat, extraireConditionsExamen } from "@/lib/controles";
import { avancerFNCApresControleConforme } from "@/lib/remiseEnConformite";
import { verifierOutilPourControle } from "@/lib/statutOutil";
import { verifierAptitudeCND, assurerAffectation } from "@/lib/aptitudePersonnel";
import { verifierConsommablesPourControle } from "@/lib/statutConsommable";

const CreateControleSchema = z
  .object({
    jointId: z.string().min(1),
    // Appareil ultrasons utilisé (bibliothèque métrologie/outillage
    // partagée, voir POST /api/outils) : optionnel, mais bloque le
    // contrôle s'il est expiré ou hors service.
    outilId: z.string().optional(),
    procedureRef: z.string().min(1),
    procedureVersion: z.string().optional(),
    indications: z.array(IndicationSchema),
    // Références vers la bibliothèque (POST /api/consommables-cnd), pas les
    // produits ressaisis ici (ex. couplant).
    consommableIds: z.array(z.string()).optional(),
    signatureId: z.string().optional(),
  })
  .merge(ConditionsExamenSchema);

// GET /api/controles-ultrasons?jointId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const jointId = req.nextUrl.searchParams.get("jointId");
  const controles = await prisma.controleUltrasons.findMany({
    where: { jointId: jointId ?? undefined },
    include: { outil: { select: { reference: true, type: true } }, consommables: { include: { consommable: true } } },
    orderBy: { dateControle: "desc" },
  });
  return NextResponse.json(controles);
}

// POST /api/controles-ultrasons (UT) — même principe que le contrôle
// visuel : contrôleur = personne authentifiée, résultat déduit des
// indications, FNC automatique si non conforme.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateControleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { jointId, outilId, procedureRef, procedureVersion, indications, consommableIds, signatureId } = parsed.data;

  const joint = await prisma.joint.findUnique({ where: { id: jointId } });
  if (!joint) {
    return NextResponse.json({ error: "Joint introuvable." }, { status: 404 });
  }

  const verifOutil = await verifierOutilPourControle(outilId);
  if (!verifOutil.ok) {
    return NextResponse.json({ error: verifOutil.erreur }, { status: 422 });
  }

  const blocage = await verifierAptitudeCND(auth.utilisateur.personnelId, joint.affaireId);
  if (blocage.bloque) {
    return NextResponse.json({ error: blocage.motif }, { status: 403 });
  }

  const verifConsommables = await verifierConsommablesPourControle(consommableIds);
  if (!verifConsommables.ok) {
    return NextResponse.json({ error: verifConsommables.erreur }, { status: 403 });
  }

  const resultat = calculerResultat(indications);

  const controle = await prisma.controleUltrasons.create({
    data: {
      jointId,
      controleurId: auth.utilisateur.personnelId,
      outilId,
      procedureRef,
      procedureVersion,
      indications: indications as object[],
      resultat,
      signatureId,
      ...extraireConditionsExamen(parsed.data),
    },
  });

  // Contexte de l'affaire (voir src/lib/aptitudePersonnel.ts) : intègre
  // automatiquement le contrôleur au planning de cette affaire s'il n'y
  // est pas déjà, plutôt que d'exiger une affectation planifiée à
  // l'avance.
  await assurerAffectation(auth.utilisateur.personnelId, joint.affaireId, "Contrôleur CND", auth.utilisateur.personnelId);

  // Liens vers les consommables utilisés, en écritures séquentielles (pas
  // de création imbriquée : voir la remarque sur les transactions dans
  // src/lib/prisma.ts).
  for (const consommableId of consommableIds ?? []) {
    await prisma.controleUltrasonsConsommable.create({
      data: { controleUltrasonsId: controle.id, consommableId },
    });
  }

  let fnc = null;
  if (resultat === "NON_CONFORME") {
    fnc = await prisma.fNC.create({
      data: {
        reference: `FNC-${joint.numero}-${Date.now()}`,
        affaireId: joint.affaireId,
        jointId,
        controleUltrasonsOrigineId: controle.id,
        description: `Contrôle par ultrasons non conforme sur ${joint.numero} (${procedureRef}).`,
        impact: "BLOQUANTE",
        statut: "DETECTION",
      },
    });
  } else if (resultat === "CONFORME") {
    await avancerFNCApresControleConforme(jointId);
  }

  return NextResponse.json({ controle, fncCreee: fnc }, { status: 201 });
}
