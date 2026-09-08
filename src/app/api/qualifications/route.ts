import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

const CreateQualificationSchema = z.object({
  personnelId: z.string().min(1),
  type: z.enum(["SOUDAGE", "CND"]),
  reference: z.string().min(1),
  norme: z.string().min(1),
  procede: z.string().optional(),
  materiaux: z.string().optional(),
  domaineValidite: z.string().optional(),
  dateObtention: z.string().datetime(),
  dateExpiration: z.string().datetime().optional(),
  certificatUrl: z.string().optional(),
});

// GET /api/qualifications?personnelId=...&type=... — liste les
// qualifications, avec un statut recalculé en direct à partir des dates (le
// statut stocké n'est fiable que pour la suspension, qui est un événement
// explicite et non déductible d'une date).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const type = req.nextUrl.searchParams.get("type");

  const qualifications = await prisma.qualification.findMany({
    where: {
      personnelId: personnelId ?? undefined,
      type: type === "SOUDAGE" || type === "CND" ? type : undefined,
    },
    include: { evenements: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { dateObtention: "desc" },
  });

  return NextResponse.json(
    qualifications.map((q) => ({
      ...q,
      statutCalcule:
        q.evenements[0]?.type === "RECONDUCTION_PROPOSEE"
          ? "EN_RENOUVELLEMENT"
          : calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }),
    }))
  );
}

// POST /api/qualifications — enregistre une qualification (QS) pour une
// personne, avec son événement d'obtention initial. Réservé au niveau 2
// minimum (chargé de travaux, coordinateur soudage...).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateQualificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateObtention, dateExpiration, ...reste } = parsed.data;

  // Écritures séquentielles (pas de création imbriquée) : voir la remarque
  // sur les transactions dans src/lib/prisma.ts.
  const qualification = await prisma.qualification.create({
    data: {
      ...reste,
      dateObtention: new Date(dateObtention),
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
    },
  });

  await prisma.qualificationEvenement.create({
    data: {
      qualificationId: qualification.id,
      type: "OBTENTION",
      valideParId: droits.utilisateur.personnelId,
    },
  });

  const qualificationAvecEvenements = await prisma.qualification.findUniqueOrThrow({
    where: { id: qualification.id },
    include: { evenements: true },
  });

  return NextResponse.json(qualificationAvecEvenements, { status: 201 });
}
