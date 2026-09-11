import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/fiches-soudage/[id] — la fiche avec la liste des joints
// qu'elle couvre.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const fiche = await prisma.ficheTechniqueSoudage.findUnique({
    where: { id: params.id },
    include: { joints: { select: { id: true, numero: true, indiceReparation: true, affaireId: true } } },
  });
  if (!fiche) {
    return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
  }
  return NextResponse.json(fiche);
}

const UpdateSchema = z.object({
  procede: z.string().optional(),
  preechauffageC: z.number().optional(),
  temperatureInterpasses: z.number().optional(),
  postchauffageC: z.number().optional(),
  tensionV: z.number().optional(),
  intensiteA: z.number().optional(),
  vitesseMmMin: z.number().optional(),
  energieKJMm: z.number().optional(),
  nombrePasses: z.number().int().optional(),
  tempsMin: z.number().optional(),
  observations: z.string().optional(),
  photosUrls: z.array(z.string()).optional(),
  // Remplace l'ensemble des joints couverts par la fiche (ajouts et
  // retraits en une fois) — omis, la liste des joints ne change pas.
  jointIds: z.array(z.string().min(1)).min(1).optional(),
  signatureId: z.string().optional(),
});

// PATCH /api/fiches-soudage/[id] — modifie les paramètres et/ou
// l'ensemble des joints couverts, tant que la fiche n'est pas signée ;
// une fois `signatureId` renseigné, plus aucune modification n'est
// acceptée — la signature atteste les valeurs comme définitives pour
// l'ensemble des joints couverts (une seule signature pour tout le lot,
// voir le cahier des charges, PRINCIPE CENTRAL).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existante = await prisma.ficheTechniqueSoudage.findUnique({
    where: { id: params.id },
    include: { joints: { select: { id: true } } },
  });
  if (!existante) {
    return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
  }
  if (existante.signatureId) {
    return NextResponse.json({ error: "Cette fiche est déjà signée : elle ne peut plus être modifiée." }, { status: 422 });
  }

  const { jointIds, signatureId, ...parametres } = parsed.data;

  if (signatureId) {
    const signature = await prisma.signature.findUnique({ where: { id: signatureId } });
    if (!signature || signature.documentType !== "FICHE_TECHNIQUE_SOUDAGE" || signature.documentId !== params.id) {
      return NextResponse.json({ error: "Signature introuvable ou ne correspond pas à cette fiche." }, { status: 422 });
    }
  }

  if (jointIds) {
    const joints = await prisma.joint.findMany({ where: { id: { in: jointIds } } });
    const jointsParId = new Map(joints.map((j) => [j.id, j]));
    const introuvables = jointIds.filter((id) => !jointsParId.has(id));
    if (introuvables.length > 0) {
      return NextResponse.json({ error: `Joint(s) introuvable(s) : ${introuvables.join(", ")}.` }, { status: 404 });
    }
    const prisDAilleurs = jointIds.filter(
      (id) => jointsParId.get(id)?.ficheSoudageId && jointsParId.get(id)?.ficheSoudageId !== params.id
    );
    if (prisDAilleurs.length > 0) {
      return NextResponse.json(
        { error: `Ce(s) joint(s) appartient (appartiennent) déjà à une autre fiche : ${prisDAilleurs.join(", ")}.` },
        { status: 422 }
      );
    }

    const actuels = new Set(existante.joints.map((j) => j.id));
    const nouveaux = new Set(jointIds);
    for (const id of actuels) {
      if (!nouveaux.has(id)) await prisma.joint.update({ where: { id }, data: { ficheSoudageId: null } });
    }
    for (const id of nouveaux) {
      if (!actuels.has(id)) await prisma.joint.update({ where: { id }, data: { ficheSoudageId: params.id } });
    }
  }

  const fiche = await prisma.ficheTechniqueSoudage.update({
    where: { id: params.id },
    data: { ...parametres, signatureId },
  });

  const ficheAvecJoints = await prisma.ficheTechniqueSoudage.findUnique({
    where: { id: fiche.id },
    include: { joints: { select: { id: true, numero: true, indiceReparation: true, affaireId: true } } },
  });
  return NextResponse.json(ficheAvecJoints);
}
