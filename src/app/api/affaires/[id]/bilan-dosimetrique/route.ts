import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const BilanDosiSchema = z.object({
  edpiMsv: z.number().optional(),
  edpoMsv: z.number().optional(),
  realiseMsv: z.number().optional(),
  deltaMsv: z.number().optional(),
  alea: z.string().optional(),
});

// GET /api/affaires/[id]/bilan-dosimetrique
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const bilan = await prisma.bilanDosimetrique.findUnique({ where: { affaireId: params.id } });
  return NextResponse.json(bilan);
}

// PATCH /api/affaires/[id]/bilan-dosimetrique — bilan dosimétrique global
// de l'affaire (voir "Bilan radioprotection" du modèle réel). Un seul
// enregistrement par affaire ; le détail par activité reste hors périmètre
// de Weldoc (outil de suivi dosimétrique externe de l'entreprise).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = BilanDosiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const existant = await prisma.bilanDosimetrique.findUnique({ where: { affaireId: params.id } });
  const bilan = existant
    ? await prisma.bilanDosimetrique.update({ where: { affaireId: params.id }, data: parsed.data })
    : await prisma.bilanDosimetrique.create({ data: { affaireId: params.id, ...parsed.data } });

  return NextResponse.json(bilan);
}
