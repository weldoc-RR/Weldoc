import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { evaluerAffectation } from "@/lib/planning";
import { tracerModification } from "@/lib/auditTrail";

const CreateAffectationSchema = z.object({
  personnelId: z.string().min(1),
  affaireId: z.string().min(1),
  jointId: z.string().optional(),
  fonction: z.string().min(1),
  // Codes d'habilitation/accès site (ex. "CODES GTA" chez certains
  // clients), en texte libre — jamais interprétés par Weldoc.
  codes: z.string().optional(),
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
  // Temps prévu (voir le cahier des charges, "TEMPS ET PRODUCTIVITÉ"), en
  // minutes — n'a de sens que si jointId est renseigné.
  dureeEstimeeMin: z.number().optional(),
});

// GET /api/affectations?personnelId=...&affaireId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const affectations = await prisma.affectation.findMany({
    where: { personnelId: personnelId ?? undefined, affaireId: affaireId ?? undefined },
    orderBy: { dateDebut: "desc" },
  });
  return NextResponse.json(affectations);
}

// POST /api/affectations — affecte une personne à une affaire (et
// éventuellement un joint précis). Vérifie compétence, qualification,
// habilitation et disponibilité, mais ne bloque jamais la création : les
// alertes sont renvoyées, la décision de passer outre reste humaine
// (traçée dans l'audit trail s'il y en a).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateAffectationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateDebut, dateFin, ...reste } = parsed.data;

  if (new Date(dateFin) <= new Date(dateDebut)) {
    return NextResponse.json({ error: "La date de fin doit être après la date de début." }, { status: 400 });
  }

  const alertes = await evaluerAffectation({
    personnelId: reste.personnelId,
    fonction: reste.fonction,
    dateDebut: new Date(dateDebut),
    dateFin: new Date(dateFin),
    jointId: reste.jointId,
  });

  const affectation = await prisma.affectation.create({
    data: {
      ...reste,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      creeParId: droits.utilisateur.personnelId,
    },
  });

  if (alertes.length > 0) {
    await tracerModification({
      utilisateurId: droits.utilisateur.personnelId,
      entite: "Affectation",
      entiteId: affectation.id,
      nouvelleValeur: { alertes },
      motif: "Affectation créée malgré des alertes.",
    });
  }

  return NextResponse.json({ affectation, alertes }, { status: 201 });
}

const UpdateAffectationSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"]),
});

// PATCH /api/affectations — fait avancer le statut d'une affectation
// (notamment EN_COURS = présence effective sur le chantier). N'écrase
// jamais les autres champs (dates, fonction, codes) : un changement de
// périmètre se fait via une nouvelle affectation.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = UpdateAffectationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affectation = await prisma.affectation.update({
    where: { id: parsed.data.id },
    data: { statut: parsed.data.statut },
  });
  return NextResponse.json(affectation);
}
