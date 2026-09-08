import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { detecterPreuvesReconduction } from "@/lib/qualifications";

const CreateReparationSchema = z.object({
  typeAction: z.enum(["REPARATION", "MEULAGE", "RESURFACAGE", "REPRISE", "REMPLACEMENT", "CONTROLE_COMPLEMENTAIRE"]),
  fncOrigineId: z.string().optional(),
  // Tout ce qui n'est pas précisé est repris du joint d'origine, plutôt que
  // ressaisi.
  ligne: z.string().optional(),
  spool: z.string().optional(),
  typeJoint: z.string().optional(),
  dn: z.string().optional(),
  diametre: z.number().optional(),
  epaisseur: z.number().optional(),
  matiereId: z.string().optional(),
  wpsReference: z.string().optional(),
  qmosReference: z.string().optional(),
  qsReference: z.string().optional(),
  soudeurId: z.string().optional(),
  consommableLot: z.string().optional(),
});

// POST /api/joints/[id]/reparation — crée une remise en conformité sur un
// joint (réparation, meulage, resurfaçage, reprise, remplacement, contrôle
// complémentaire), comme demandé au cahier des charges. Le joint initial
// n'est jamais modifié ni écrasé : la réparation est un nouveau joint, avec
// le même numéro et un indice de réparation incrémenté (M800 → M800 R1 →
// M800 R2...), relié au précédent. Si elle répond à une FNC, la FNC passe
// en ACTION_CORRECTIVE et se rattache à ce nouveau joint.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateReparationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { typeAction, fncOrigineId, ...overrides } = parsed.data;

  const jointOrigine = await prisma.joint.findUnique({ where: { id: params.id } });
  if (!jointOrigine) {
    return NextResponse.json({ error: "Joint introuvable." }, { status: 404 });
  }

  if (fncOrigineId) {
    const fnc = await prisma.fNC.findUnique({ where: { id: fncOrigineId } });
    if (!fnc || fnc.affaireId !== jointOrigine.affaireId) {
      return NextResponse.json(
        { error: "La FNC indiquée est introuvable ou ne concerne pas cette affaire." },
        { status: 422 }
      );
    }
  }

  const reparation = await prisma.joint.create({
    data: {
      affaireId: jointOrigine.affaireId,
      numero: jointOrigine.numero,
      indiceReparation: jointOrigine.indiceReparation + 1,
      jointParentId: jointOrigine.id,
      typeAction,
      ligne: overrides.ligne ?? jointOrigine.ligne,
      spool: overrides.spool ?? jointOrigine.spool,
      typeJoint: overrides.typeJoint ?? jointOrigine.typeJoint,
      dn: overrides.dn ?? jointOrigine.dn,
      diametre: overrides.diametre ?? jointOrigine.diametre,
      epaisseur: overrides.epaisseur ?? jointOrigine.epaisseur,
      matiereId: overrides.matiereId ?? jointOrigine.matiereId,
      wpsReference: overrides.wpsReference ?? jointOrigine.wpsReference,
      qmosReference: overrides.qmosReference ?? jointOrigine.qmosReference,
      qsReference: overrides.qsReference ?? jointOrigine.qsReference,
      soudeurId: overrides.soudeurId ?? jointOrigine.soudeurId,
      consommableLot: overrides.consommableLot ?? jointOrigine.consommableLot,
    },
  });

  if (reparation.soudeurId) {
    await detecterPreuvesReconduction(reparation.soudeurId, reparation.id);
  }

  let fnc = null;
  if (fncOrigineId) {
    const fncActuelle = await prisma.fNC.findUniqueOrThrow({ where: { id: fncOrigineId } });
    fnc = await prisma.fNC.update({
      where: { id: fncOrigineId },
      data: {
        actionCorrectiveJointId: reparation.id,
        statut: fncActuelle.statut === "DETECTION" || fncActuelle.statut === "ANALYSE" ? "ACTION_CORRECTIVE" : undefined,
      },
    });
  }

  return NextResponse.json({ reparation, fnc }, { status: 201 });
}
