import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreatePointSchema = z.object({
  affaireId: z.string().min(1),
  jointId: z.string().optional(),
  phaseId: z.string().optional(),
  intitule: z.string().min(1),
  referentiel: z.string().optional(),
  // Statut initial du point, en même temps que sa création (voir POST
  // /api/points-reglementaires/[id]/evenements pour les changements
  // ultérieurs). DEBLOCAGE_AUTORISE dès la création n'a pas de sens
  // (rien à débloquer), donc exclu ici.
  statut: z.enum(["NON_BLOQUANT", "BLOQUANT", "SOUS_RESERVE", "ATTENTE_DECISION"]),
  commentaire: z.string().optional(),
});

// GET /api/points-reglementaires?affaireId=... — le dossier réglementaire
// d'une affaire : chaque point avec son historique complet (le statut
// actuel est le dernier événement, jamais une valeur stockée à part).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const points = await prisma.pointReglementaire.findMany({
    where: { affaireId: affaireId ?? undefined },
    include: {
      joint: { select: { numero: true, indiceReparation: true } },
      phase: { select: { nom: true } },
      evenements: {
        orderBy: { date: "desc" },
        include: { auteur: { select: { nom: true, prenom: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(points);
}

// POST /api/points-reglementaires — ouvre un nouveau point réglementaire
// avec son statut initial (niveau 2 minimum, comme les autres créations de
// fiches de suivi). L'intitulé et le référentiel restent en texte libre :
// leur liste dépend du projet/référentiel client, jamais imposée par
// Weldoc.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreatePointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { statut, commentaire, ...donneesPoint } = parsed.data;

  const affaire = await prisma.affaire.findUnique({ where: { id: donneesPoint.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const point = await prisma.pointReglementaire.create({ data: donneesPoint });
  const evenement = await prisma.pointReglementaireEvenement.create({
    data: {
      pointReglementaireId: point.id,
      statut,
      commentaire,
      auteurId: droits.utilisateur.personnelId,
    },
  });

  return NextResponse.json({ point, evenement }, { status: 201 });
}
