import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  texte: z.string().min(1),
});

// GET /api/notes-rex?affaireId=... — notes REX d'une affaire (voir le
// cahier des charges, "RETOUR D'EXPÉRIENCE (REX)") : contrairement à
// FicheREX (une fiche par FNC, rédigée après coup), une note se prend à
// tout moment, par n'importe quel intervenant, pour alimenter le REX au
// fil de l'affaire plutôt que tout rédiger d'un coup à la clôture.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const notes = await prisma.noteRex.findMany({
    where: { affaireId: affaireId ?? undefined },
    include: { auteur: { select: { nom: true, prenom: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

// POST /api/notes-rex — n'importe quelle personne connectée (comme la
// rédaction d'une fiche REX) : ce n'est pas une décision réglementaire,
// juste une observation notée au fil de l'eau. Jamais de route de
// modification/suppression, volontairement, comme les autres constats de
// ce type dans Weldoc.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: parsed.data.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const note = await prisma.noteRex.create({
    data: { ...parsed.data, auteurId: auth.utilisateur.personnelId },
  });
  return NextResponse.json(note, { status: 201 });
}
