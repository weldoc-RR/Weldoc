import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// Un trait de l'annotation (voir src/app/joints/iso-canvas.tsx, déjà
// utilisé pour l'ISO manuel du TQC) : une liste de points en coordonnées
// relatives (0..1), une couleur, une épaisseur — jamais une image figée.
const IsoTraitSchema = z.object({
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(2),
  couleur: z.string().min(1),
  epaisseur: z.number().positive(),
});

const UpdateSchema = z.object({
  annotations: z.array(IsoTraitSchema),
});

// PATCH /api/photos/[id] — annotation graphique d'une photo du book photo
// (voir le cahier des charges, "BOOK PHOTO" : "annotables"), même
// mécanisme que l'ISO manuel du TQC. Ouvert à toute personne connectée
// (comme l'ajout d'une photo) : le book photo n'a pas de notion de
// signature, donc pas de restriction de modification une fois posée.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  const misAJour = await prisma.photo.update({
    where: { id: params.id },
    data: { annotations: parsed.data.annotations },
  });
  return NextResponse.json(misAJour);
}
