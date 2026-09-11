import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  portee: z.enum(["INTERNE", "EXTERNE"]),
  nom: z.string().min(1),
  organisme: z.string().optional(),
});

// GET /api/diffusions-rfi?affaireId=... — liste de diffusion du RFI (voir
// le cartouche du modèle réel) : des noms/organismes en texte libre, pas
// forcément des fiches Personnel (souvent des destinataires externes).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const diffusions = await prisma.diffusionRFI.findMany({
    where: { affaireId: affaireId ?? undefined },
    orderBy: { nom: "asc" },
  });
  return NextResponse.json(diffusions);
}

// POST /api/diffusions-rfi
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

  const diffusion = await prisma.diffusionRFI.create({ data: parsed.data });
  return NextResponse.json(diffusion, { status: 201 });
}
