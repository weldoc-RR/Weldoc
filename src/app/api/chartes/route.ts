import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const PublierCharteSchema = z.object({
  version: z.string().min(1),
  contenu: z.string().min(1),
});

// GET /api/chartes — liste des versions de la charte d'utilisation et
// d'intégrité, avec `enVigueur` calculé à la lecture (la plus récente par
// date de publication), et si la personne connectée l'a acceptée.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const chartes = await prisma.chartVersion.findMany({
    orderBy: { publieLe: "desc" },
    include: { acceptations: { where: { personnelId: auth.utilisateur.personnelId } } },
  });

  return NextResponse.json(
    chartes.map((c, index) => ({
      id: c.id,
      version: c.version,
      contenu: c.contenu,
      publieLe: c.publieLe,
      enVigueur: index === 0,
      accepteeParMoi: c.acceptations.length > 0,
    }))
  );
}

// POST /api/chartes — publie une nouvelle version de la charte, niveau 3
// minimum. Ne remplace jamais une version existante : une nouvelle version
// est un nouvel enregistrement, et devra être réacceptée par tout le monde
// avant de pouvoir de nouveau signer un document.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = PublierCharteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const charte = await prisma.chartVersion.create({ data: parsed.data });
  return NextResponse.json(charte, { status: 201 });
}
