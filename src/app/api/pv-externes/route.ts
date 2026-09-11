import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  jointId: z.string().optional(),
  phaseId: z.string().optional(),
  intitule: z.string().min(1),
  prestataire: z.string().optional(),
  url: z.string().min(1),
  dateDocument: z.string().datetime().optional(),
});

// GET /api/pv-externes?affaireId=...&jointId=...&phaseId=... — documents de
// prestataires externes importés (voir le cahier des charges, "PV
// EXTERNES"), avec leur revue si elle a eu lieu.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const jointId = req.nextUrl.searchParams.get("jointId");
  const phaseId = req.nextUrl.searchParams.get("phaseId");
  const pvExternes = await prisma.pVExterne.findMany({
    where: { affaireId: affaireId ?? undefined, jointId: jointId ?? undefined, phaseId: phaseId ?? undefined },
    include: {
      importePar: { select: { nom: true, prenom: true } },
      revuePar: { select: { nom: true, prenom: true } },
      joint: { select: { numero: true, indiceReparation: true } },
    },
    orderBy: { dateImport: "desc" },
  });
  return NextResponse.json(pvExternes);
}

// POST /api/pv-externes — importe un document externe (niveau 2 minimum).
// L'importeur est toujours la personne authentifiée. `url` reste du texte
// libre pour l'instant (voir le modèle Photo, même limite).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateDocument, ...reste } = parsed.data;

  const affaire = await prisma.affaire.findUnique({ where: { id: reste.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const pvExterne = await prisma.pVExterne.create({
    data: {
      ...reste,
      dateDocument: dateDocument ? new Date(dateDocument) : undefined,
      importeParId: droits.utilisateur.personnelId,
    },
  });

  return NextResponse.json(pvExterne, { status: 201 });
}
