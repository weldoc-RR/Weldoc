import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  type: z.enum(["PRISE_EN_CHARGE", "RESTITUTION"]),
  zone: z.string().optional(),
  observations: z.string().optional(),
  degradationsConstatees: z.string().optional(),
  documentsEntree: z.string().optional(),
});

// GET /api/etats-des-lieux?affaireId=...&type=... — les constats d'une
// affaire (voir le cahier des charges, "PRISE EN CHARGE ET RESTITUTION DU
// CHANTIER"), les plus récents en premier. Un nouveau constat, même type,
// ne remplace jamais le précédent (rien n'est jamais écrasé) : c'est au
// plus récent de chaque type de faire foi côté affichage.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const type = req.nextUrl.searchParams.get("type");
  const etatsDesLieux = await prisma.etatDesLieux.findMany({
    where: { affaireId: affaireId ?? undefined, type: type === "PRISE_EN_CHARGE" || type === "RESTITUTION" ? type : undefined },
    include: {
      redacteur: { select: { nom: true, prenom: true } },
      reserves: { orderBy: { dateAjout: "asc" } },
      photos: { include: { auteur: { select: { nom: true, prenom: true } } }, orderBy: { dateAjout: "desc" } },
    },
    orderBy: { dateConstat: "desc" },
  });
  return NextResponse.json(etatsDesLieux);
}

// POST /api/etats-des-lieux — ouvre un nouveau constat (prise en charge ou
// restitution). Le rédacteur est toujours la personne connectée.
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

  const etatDesLieux = await prisma.etatDesLieux.create({
    data: { ...parsed.data, redacteurId: auth.utilisateur.personnelId },
  });

  return NextResponse.json(etatDesLieux, { status: 201 });
}
