import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreatePhotoSchema = z.object({
  affaireId: z.string().min(1),
  phaseId: z.string().optional(),
  jointId: z.string().optional(),
  fncId: z.string().optional(),
  etatDesLieuxId: z.string().optional(),
  url: z.string().min(1),
  commentaire: z.string().optional(),
});

// GET /api/photos?affaireId=...&jointId=...&phaseId=...&fncId=...&etatDesLieuxId=...
// — book photo (voir le cahier des charges) : les photos les plus récentes
// en premier. Filtrable sur n'importe laquelle des cinq attaches.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const jointId = req.nextUrl.searchParams.get("jointId");
  const phaseId = req.nextUrl.searchParams.get("phaseId");
  const fncId = req.nextUrl.searchParams.get("fncId");
  const etatDesLieuxId = req.nextUrl.searchParams.get("etatDesLieuxId");

  const photos = await prisma.photo.findMany({
    where: {
      affaireId: affaireId ?? undefined,
      jointId: jointId ?? undefined,
      phaseId: phaseId ?? undefined,
      fncId: fncId ?? undefined,
      etatDesLieuxId: etatDesLieuxId ?? undefined,
    },
    include: { auteur: { select: { nom: true, prenom: true } }, joint: { select: { numero: true } } },
    orderBy: { dateAjout: "desc" },
  });
  return NextResponse.json(photos);
}

// POST /api/photos — ajoute une photo au book photo. L'auteur est toujours
// la personne authentifiée (jamais une valeur transmise par le client).
// `url` reste du texte libre : pas de téléversement de fichier intégré à
// Weldoc pour l'instant (voir le modèle Photo dans le schéma).
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreatePhotoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: parsed.data.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const photo = await prisma.photo.create({
    data: { ...parsed.data, auteurId: auth.utilisateur.personnelId },
  });

  return NextResponse.json(photo, { status: 201 });
}
