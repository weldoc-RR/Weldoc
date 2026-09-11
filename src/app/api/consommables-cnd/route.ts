import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const TYPES_CONSOMMABLE = [
  "PENETRANT",
  "REVELATEUR",
  "NETTOYANT",
  "POUDRE_MAGNETIQUE",
  "PRODUIT_CONTRASTE",
  "DEMAGNETISANT",
  "FILM_RADIOGRAPHIQUE",
  "PRODUIT_DEVELOPPEMENT",
  "COUPLANT",
  "AUTRE",
] as const;

const CreateConsommableSchema = z.object({
  type: z.enum(TYPES_CONSOMMABLE),
  fabricant: z.string().min(1),
  reference: z.string().min(1),
  lot: z.string().min(1),
  peremption: z.string().datetime().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/consommables-cnd?type=... — bibliothèque des consommables CND
// (ressuage, magnétoscopie, radiographie, ultrasons — voir TypeConsommableCND).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const type = req.nextUrl.searchParams.get("type");
  const typeValide = (TYPES_CONSOMMABLE as readonly string[]).includes(type ?? "") ? (type as (typeof TYPES_CONSOMMABLE)[number]) : undefined;
  const consommables = await prisma.consommableCND.findMany({
    where: { type: typeValide },
    orderBy: { fabricant: "asc" },
  });
  return NextResponse.json(consommables);
}

// POST /api/consommables-cnd — enregistre un produit/lot dans la
// bibliothèque, réutilisable ensuite sur chaque PV sans le ressaisir. Si le
// même produit/lot existe déjà, on renvoie l'enregistrement existant plutôt
// que d'en créer un doublon.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateConsommableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { peremption, ...reste } = parsed.data;

  const existant = await prisma.consommableCND.findUnique({
    where: {
      type_fabricant_reference_lot: {
        type: reste.type,
        fabricant: reste.fabricant,
        reference: reste.reference,
        lot: reste.lot,
      },
    },
  });
  if (existant) {
    return NextResponse.json(existant);
  }

  const consommable = await prisma.consommableCND.create({
    data: { ...reste, peremption: peremption ? new Date(peremption) : undefined },
  });

  return NextResponse.json(consommable, { status: 201 });
}
