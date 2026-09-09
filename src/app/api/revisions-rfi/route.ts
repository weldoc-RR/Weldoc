import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  indice: z.string().min(1),
  natureEvolutions: z.string().min(1),
  redacteurs: z.string().optional(),
  verificateurs: z.string().optional(),
  approbateurs: z.string().optional(),
});

// GET /api/revisions-rfi?affaireId=... — historique des révisions du RFI
// (voir le cartouche du modèle réel : indice/date/nature des évolutions/
// rédacteur(s)/vérificateur(s)/approbateur(s)).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const revisions = await prisma.revisionRFI.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(revisions);
}

// POST /api/revisions-rfi — une nouvelle évolution du document, jamais une
// modification de la précédente.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: parsed.data.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const revision = await prisma.revisionRFI.create({ data: parsed.data });
  return NextResponse.json(revision, { status: 201 });
}
