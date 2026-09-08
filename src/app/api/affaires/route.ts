import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { creerSequencesParDefaut } from "@/lib/sequencement";

const CreateAffaireSchema = z.object({
  numero: z.string().min(1),
  client: z.string().min(1),
  projet: z.string().min(1),
  // CHANTIER (travaux sur site) ou ATELIER (fabrication en atelier) : dans
  // ce dernier cas, chantier/site n'ont souvent pas de sens et restent
  // optionnels.
  typeRealisation: z.enum(["CHANTIER", "ATELIER"]).optional(),
  chantier: z.string().optional(),
  site: z.string().optional(),
  responsableId: z.string().optional(),
  chargeAffairesId: z.string().optional(),
  coordinateurSoudageId: z.string().optional(),
  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),
});

// GET /api/affaires — liste toutes les affaires
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaires = await prisma.affaire.findMany({
    orderBy: { createdAt: "desc" },
    include: { joints: true, fncs: true },
  });
  return NextResponse.json(affaires);
}

// POST /api/affaires — crée une nouvelle affaire (le "conteneur" principal)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateAffaireSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.create({
    data: {
      ...parsed.data,
      dateDebut: parsed.data.dateDebut ? new Date(parsed.data.dateDebut) : undefined,
      dateFin: parsed.data.dateFin ? new Date(parsed.data.dateFin) : undefined,
    },
  });

  // Le dossier de fabrication démarre avec les 5 séquences par défaut du
  // cahier des charges (prise en charge → ... → vérification finale).
  await creerSequencesParDefaut(affaire.id);

  return NextResponse.json(affaire, { status: 201 });
}

const UpdateRolesSchema = z.object({
  id: z.string().min(1),
  responsableId: z.string().nullable().optional(),
  chargeAffairesId: z.string().nullable().optional(),
  coordinateurSoudageId: z.string().nullable().optional(),
});

// PATCH /api/affaires — met à jour les rôles d'une affaire (responsable,
// chargé d'affaires, coordinateur soudage), utilisés pour générer
// automatiquement l'organigramme (GET /api/affaires/[id]/organigramme).
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = UpdateRolesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, ...updates } = parsed.data;

  const affaire = await prisma.affaire.update({ where: { id }, data: updates });
  return NextResponse.json(affaire);
}
