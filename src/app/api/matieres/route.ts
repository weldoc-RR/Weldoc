import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateMatiereSchema = z.object({
  affaireId: z.string().min(1),
  fournisseur: z.string().min(1),
  designation: z.string().min(1),
  reference: z.string().optional(),
  normeProduit: z.string().min(1),
  nuance: z.string().min(1),
  diametre: z.number().optional(),
  epaisseur: z.number().optional(),
  finition: z.string().optional(),
  etat: z.string().optional(),
  numeroCoulee: z.string().min(1),
  numeroLot: z.string().optional(),
  ccpuDocumentUrl: z.string().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/matieres?affaireId=...&numeroCoulee=...&recherche=...
// Réceptionnée une seule fois, une matière est ensuite réutilisée sur
// chaque joint qui l'emploie (Joint.matiereId) sans être ressaisie.
// `recherche` retrouve la matière à partir du seul numéro lisible sur
// l'étiquette (coulée ou lot, sans que l'intervenant ait besoin de savoir
// lequel des deux c'est) — voir "Rechercher une matière" sur /joints.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const numeroCoulee = req.nextUrl.searchParams.get("numeroCoulee");
  const recherche = req.nextUrl.searchParams.get("recherche");
  const matieres = await prisma.matiere.findMany({
    where: {
      affaireId: affaireId ?? undefined,
      numeroCoulee: numeroCoulee ?? undefined,
      ...(recherche
        ? {
            OR: [
              { numeroCoulee: { contains: recherche, mode: "insensitive" } },
              { numeroLot: { contains: recherche, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { numeroCoulee: "asc" },
  });
  return NextResponse.json(matieres);
}

// POST /api/matieres — réception d'une matière (fournisseur, CCPU,
// certificat, numéro de coulée/lot...), niveau 2 minimum.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateMatiereSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const matiere = await prisma.matiere.create({ data: parsed.data });
  return NextResponse.json(matiere, { status: 201 });
}
