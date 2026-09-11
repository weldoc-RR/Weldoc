import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// Un trait de l'ISO manuel au stylet (voir src/app/joints/iso-canvas.tsx) :
// une liste de points en coordonnées relatives (0..1), une couleur, une
// épaisseur — jamais une image figée, pour que le tracé reste net quel
// que soit l'écran où il est redessiné.
const IsoTraitSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  couleur: z.string().min(1),
  epaisseur: z.number().positive(),
});

const TqcSchema = z.object({
  localisation: z.string().optional(),
  equipement: z.string().optional(),
  support: z.string().optional(),
  ecarts: z.string().optional(),
  observations: z.string().optional(),
  isoFondUrl: z.string().optional(),
  isoTraits: z.array(IsoTraitSchema).optional(),
  signatureId: z.string().optional(),
});

// GET /api/joints/[id]/tqc — le TQC ("tel que construit") du joint.
// Références M800/M801 (numéro/indice de réparation), dimensions mesurées
// et photos ne sont jamais redemandées ici : elles viennent déjà du joint
// (contrôle dimensionnel, book photo).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const tqc = await prisma.tQC.findUnique({ where: { jointId: params.id } });
  return NextResponse.json(tqc);
}

// PATCH /api/joints/[id]/tqc — remplit ou complète le TQC. Modifiable tant
// qu'il n'est pas signé ; une fois `signatureId` renseigné, plus aucune
// modification n'est acceptée (même principe que la fiche technique de
// suivi de soudage) : la signature atteste le document comme définitif.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = TqcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const joint = await prisma.joint.findUnique({ where: { id: params.id } });
  if (!joint) {
    return NextResponse.json({ error: "Joint introuvable." }, { status: 404 });
  }

  const existant = await prisma.tQC.findUnique({ where: { jointId: params.id } });
  if (existant?.signatureId) {
    return NextResponse.json({ error: "Ce TQC est déjà signé : il ne peut plus être modifié." }, { status: 422 });
  }

  if (parsed.data.signatureId) {
    const signature = await prisma.signature.findUnique({ where: { id: parsed.data.signatureId } });
    if (!signature || signature.documentType !== "TQC" || signature.documentId !== params.id) {
      return NextResponse.json({ error: "Signature introuvable ou ne correspond pas à ce TQC." }, { status: 422 });
    }
  }

  const tqc = existant
    ? await prisma.tQC.update({ where: { jointId: params.id }, data: parsed.data })
    : await prisma.tQC.create({ data: { jointId: params.id, ...parsed.data } });

  return NextResponse.json(tqc);
}
