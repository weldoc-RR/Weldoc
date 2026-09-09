import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  jointIds: z.array(z.string().min(1)).min(1),
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
});

// POST /api/fiches-soudage — crée une fiche technique de suivi de
// soudage couvrant un ou plusieurs joints (voir le cahier des charges,
// "FICHE TECHNIQUE DE SUIVI DE SOUDAGE" et PRINCIPE CENTRAL : "une donnée
// saisie une seule fois"). Un même soudeur qui réalise plusieurs
// soudures avec les mêmes paramètres dans la même période coche
// simplement plusieurs joints : une seule fiche, une seule signature à
// venir (voir PATCH /api/fiches-soudage/[id]) couvriront l'ensemble. Un
// joint qui a déjà une fiche (signée ou non) ne peut pas être repris ici
// — il faut modifier cette fiche existante plutôt que d'en créer une
// autre pour le même joint.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { jointIds, ...parametres } = parsed.data;

  const joints = await prisma.joint.findMany({ where: { id: { in: jointIds } } });
  const jointsParId = new Map(joints.map((j) => [j.id, j]));

  const introuvables = jointIds.filter((id) => !jointsParId.has(id));
  if (introuvables.length > 0) {
    return NextResponse.json({ error: `Joint(s) introuvable(s) : ${introuvables.join(", ")}.` }, { status: 404 });
  }
  const dejaCouverts = jointIds.filter((id) => jointsParId.get(id)?.ficheSoudageId);
  if (dejaCouverts.length > 0) {
    return NextResponse.json(
      { error: `Ce(s) joint(s) a (ont) déjà une fiche : ${dejaCouverts.join(", ")} — modifiez-la plutôt.` },
      { status: 422 }
    );
  }

  // Écriture de la fiche puis rattachement de chaque joint par une mise à
  // jour de champ scalaire séparée (Joint.ficheSoudageId) plutôt qu'une
  // création imbriquée avec relation : évite toute question de
  // transaction (voir src/lib/prisma.ts), même si un simple scalaire n'en
  // poserait de toute façon pas.
  const fiche = await prisma.ficheTechniqueSoudage.create({ data: parametres });
  for (const jointId of jointIds) {
    await prisma.joint.update({ where: { id: jointId }, data: { ficheSoudageId: fiche.id } });
  }

  const ficheAvecJoints = await prisma.ficheTechniqueSoudage.findUnique({
    where: { id: fiche.id },
    include: { joints: { select: { id: true, numero: true, indiceReparation: true, affaireId: true } } },
  });

  return NextResponse.json(ficheAvecJoints, { status: 201 });
}
