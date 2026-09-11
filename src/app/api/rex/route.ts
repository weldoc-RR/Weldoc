import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  fncId: z.string().min(1),
  typeProbleme: z.string().min(1),
  origine: z.string().optional(),
  cause: z.string().min(1),
  solution: z.string().min(1),
  resultat: z.string().optional(),
});

// GET /api/rex — base de retour d'expérience (voir le cahier des charges,
// "RETOUR D'EXPÉRIENCE (REX)") : une fiche par FNC documentée. Le
// classement par matériau/procédé/fournisseur/type de joint/chantier se
// lit sur le joint et l'affaire de la FNC (jamais dupliqué ici).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const fiches = await prisma.ficheREX.findMany({
    include: {
      redacteur: { select: { nom: true, prenom: true } },
      fnc: {
        select: {
          reference: true,
          description: true,
          impact: true,
          affaire: { select: { id: true, numero: true, chantier: true } },
          joint: {
            select: {
              numero: true,
              indiceReparation: true,
              typeJoint: true,
              wpsReference: true,
              wps: { select: { procede: true } },
              matiere: { select: { nuance: true, fournisseur: true } },
            },
          },
        },
      },
    },
    orderBy: { dateRedaction: "desc" },
  });
  return NextResponse.json(fiches);
}

// POST /api/rex — rédige la fiche REX d'une FNC (niveau 1 minimum : ce
// n'est pas une décision réglementaire, juste une synthèse de ce qui
// s'est passé). Une FNC n'a qu'une seule fiche REX (fncId unique) ;
// aucune route de modification n'existe volontairement — une fiche REX
// écrite avec de nouveaux éléments se corrige en la retirant en base et
// en la réécrivant, comme tout enregistrement de constat de ce type dans
// Weldoc reste rarement révisé une fois posé.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const fnc = await prisma.fNC.findUnique({ where: { id: parsed.data.fncId } });
  if (!fnc) {
    return NextResponse.json({ error: "FNC introuvable." }, { status: 404 });
  }
  const existante = await prisma.ficheREX.findUnique({ where: { fncId: parsed.data.fncId } });
  if (existante) {
    return NextResponse.json({ error: "Cette FNC a déjà une fiche REX." }, { status: 422 });
  }

  const fiche = await prisma.ficheREX.create({
    data: { ...parsed.data, redacteurId: auth.utilisateur.personnelId },
  });
  return NextResponse.json(fiche, { status: 201 });
}
