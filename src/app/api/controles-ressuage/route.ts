import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { IndicationSchema, calculerResultat } from "@/lib/controles";
import { avancerFNCApresControleConforme } from "@/lib/remiseEnConformite";

const CreateControleRessuageSchema = z.object({
  jointId: z.string().min(1),
  controleVisuelPrealableId: z.string().min(1),
  procedureRef: z.string().min(1),
  procedureVersion: z.string().optional(),
  indications: z.array(IndicationSchema),
  // Références vers la bibliothèque (POST /api/consommables-cnd), pas les
  // produits ressaisis ici.
  consommableIds: z.array(z.string()).optional(),
});

// GET /api/controles-ressuage?jointId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const jointId = req.nextUrl.searchParams.get("jointId");
  const controles = await prisma.controleRessuage.findMany({
    where: { jointId: jointId ?? undefined },
    include: { consommables: { include: { consommable: true } } },
    orderBy: { dateControle: "desc" },
  });
  return NextResponse.json(controles);
}

// POST /api/controles-ressuage
// Le contrôle visuel préalable est obligatoire, en pratique comme dans le
// modèle : impossible de faire un ressuage sur un joint qui n'a pas encore
// été inspecté visuellement.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateControleRessuageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { jointId, controleVisuelPrealableId, procedureRef, procedureVersion, indications, consommableIds } =
    parsed.data;

  const joint = await prisma.joint.findUnique({ where: { id: jointId } });
  if (!joint) {
    return NextResponse.json({ error: "Joint introuvable." }, { status: 404 });
  }

  const controleVisuel = await prisma.controleVisuel.findUnique({ where: { id: controleVisuelPrealableId } });
  if (!controleVisuel || controleVisuel.jointId !== jointId) {
    return NextResponse.json(
      { error: "Le contrôle visuel préalable est introuvable ou ne concerne pas ce joint." },
      { status: 422 }
    );
  }

  const resultat = calculerResultat(indications);

  const controle = await prisma.controleRessuage.create({
    data: {
      jointId,
      controleurId: auth.utilisateur.personnelId,
      controleVisuelPrealableId,
      procedureRef,
      procedureVersion,
      indications: indications as object[],
      resultat,
    },
  });

  // Liens vers les consommables utilisés, en écritures séquentielles (pas
  // de création imbriquée : voir la remarque sur les transactions dans
  // src/lib/prisma.ts).
  for (const consommableId of consommableIds ?? []) {
    await prisma.controleRessuageConsommable.create({
      data: { controleRessuageId: controle.id, consommableId },
    });
  }

  let fnc = null;
  if (resultat === "NON_CONFORME") {
    fnc = await prisma.fNC.create({
      data: {
        reference: `FNC-${joint.numero}-${Date.now()}`,
        affaireId: joint.affaireId,
        jointId,
        controleRessuageOrigineId: controle.id,
        description: `Contrôle par ressuage non conforme sur ${joint.numero} (${procedureRef}).`,
        impact: "BLOQUANTE",
        statut: "DETECTION",
      },
    });
  } else if (resultat === "CONFORME") {
    await avancerFNCApresControleConforme(jointId);
  }

  return NextResponse.json({ controle, fncCreee: fnc }, { status: 201 });
}
