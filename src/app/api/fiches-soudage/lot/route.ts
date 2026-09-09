import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { creerSignature } from "@/lib/signature";

const LotSchema = z.object({
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
  identifiant: z.string().min(1),
  pin: z.string().min(1),
});

// POST /api/fiches-soudage/lot — saisie groupée de la fiche technique de
// suivi de soudage sur plusieurs joints à la fois, quand le même soudeur
// a réalisé plusieurs soudures avec les mêmes paramètres (voir le cahier
// des charges, PRINCIPE CENTRAL : "une donnée saisie une seule fois").
// Les mêmes valeurs sont appliquées à chaque joint choisi, mais chaque
// joint garde SA PROPRE fiche et SA PROPRE signature (une par joint,
// comme d'habitude, réutilise creerSignature() — mêmes vérifications
// PIN/charte/autorisation de signature qu'une signature individuelle) :
// une seule saisie du PIN suffit côté écran, mais Weldoc trace chaque
// joint signé individuellement, exactement comme s'il avait été signé un
// par un. Écritures séquentielles (pas de transaction, voir
// src/lib/prisma.ts) : la réponse détaille le résultat joint par joint.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = LotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { jointIds, identifiant, pin, ...parametres } = parsed.data;

  // Vérification préalable de tous les joints avant d'écrire quoi que ce
  // soit : un joint introuvable ou déjà signé bloque le lot entier plutôt
  // que d'être silencieusement ignoré (rien n'est jamais écrasé).
  const joints = await prisma.joint.findMany({
    where: { id: { in: jointIds } },
    include: { ficheSoudage: { select: { signatureId: true } } },
  });
  const jointsParId = new Map(joints.map((j) => [j.id, j]));

  const introuvables = jointIds.filter((id) => !jointsParId.has(id));
  if (introuvables.length > 0) {
    return NextResponse.json({ error: `Joint(s) introuvable(s) : ${introuvables.join(", ")}.` }, { status: 404 });
  }
  const dejaSignes = jointIds.filter((id) => jointsParId.get(id)?.ficheSoudage?.signatureId);
  if (dejaSignes.length > 0) {
    return NextResponse.json(
      { error: `La fiche de ce(s) joint(s) est déjà signée, retirez-le(s) du lot : ${dejaSignes.join(", ")}.` },
      { status: 422 }
    );
  }

  const resultats: { jointId: string; ok: boolean; erreur?: string }[] = [];

  for (const jointId of jointIds) {
    const ficheExiste = jointsParId.get(jointId)?.ficheSoudage != null;
    const fiche = ficheExiste
      ? await prisma.ficheTechniqueSoudage.update({ where: { jointId }, data: parametres })
      : await prisma.ficheTechniqueSoudage.create({ data: { jointId, ...parametres } });

    const signature = await creerSignature({
      identifiant,
      pin,
      documentType: "FICHE_TECHNIQUE_SOUDAGE",
      documentId: jointId,
      versionDocument: fiche.procede || "v1",
    });
    if (!signature.ok) {
      resultats.push({ jointId, ok: false, erreur: signature.erreur });
      continue;
    }
    await prisma.ficheTechniqueSoudage.update({ where: { jointId }, data: { signatureId: signature.signature.id } });
    resultats.push({ jointId, ok: true });
  }

  return NextResponse.json({ resultats }, { status: 201 });
}
