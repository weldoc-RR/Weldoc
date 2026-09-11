import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { IndicationSchema, ConditionsExamenSchema, calculerResultat, extraireConditionsExamen } from "@/lib/controles";
import { avancerFNCApresControleConforme } from "@/lib/remiseEnConformite";
import { verifierAptitudeCND, assurerAffectation } from "@/lib/aptitudePersonnel";

const CreateControleVisuelSchema = z
  .object({
    jointId: z.string().min(1),
    procedureRef: z.string().min(1),
    procedureVersion: z.string().optional(),
    indications: z.array(IndicationSchema),
    signatureId: z.string().optional(),
  })
  .merge(ConditionsExamenSchema);

// GET /api/controles-visuels?jointId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const jointId = req.nextUrl.searchParams.get("jointId");
  const controles = await prisma.controleVisuel.findMany({
    where: { jointId: jointId ?? undefined },
    orderBy: { dateControle: "desc" },
  });
  return NextResponse.json(controles);
}

// POST /api/controles-visuels
// Comme pour le contrôle dimensionnel : le contrôleur est la personne
// authentifiée, le résultat est déduit des indications (jamais saisi
// directement), et une FNC est ouverte automatiquement si le contrôle est
// non conforme.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateControleVisuelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { jointId, procedureRef, procedureVersion, indications, signatureId } = parsed.data;

  const joint = await prisma.joint.findUnique({ where: { id: jointId } });
  if (!joint) {
    return NextResponse.json({ error: "Joint introuvable." }, { status: 404 });
  }

  const blocage = await verifierAptitudeCND(auth.utilisateur.personnelId, joint.affaireId);
  if (blocage.bloque) {
    return NextResponse.json({ error: blocage.motif }, { status: 403 });
  }

  const resultat = calculerResultat(indications);

  const controle = await prisma.controleVisuel.create({
    data: {
      jointId,
      controleurId: auth.utilisateur.personnelId,
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

  let fnc = null;
  if (resultat === "NON_CONFORME") {
    fnc = await prisma.fNC.create({
      data: {
        reference: `FNC-${joint.numero}-${Date.now()}`,
        affaireId: joint.affaireId,
        jointId,
        controleVisuelOrigineId: controle.id,
        description: `Contrôle visuel non conforme sur ${joint.numero} (${procedureRef}).`,
        impact: "BLOQUANTE",
        statut: "DETECTION",
      },
    });
  } else if (resultat === "CONFORME") {
    await avancerFNCApresControleConforme(jointId);
  }

  return NextResponse.json({ controle, fncCreee: fnc }, { status: 201 });
}
