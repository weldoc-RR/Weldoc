import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { verifierSequencementAutorise } from "@/lib/sequencement";
import { pointsBloquants } from "@/lib/dossierReglementaire";
import { tracerModification } from "@/lib/auditTrail";

const CreatePhaseSchema = z.object({
  sequenceId: z.string().min(1),
  ordre: z.number().int(),
  nom: z.string().min(1),
  obligatoire: z.boolean().optional(),
});

const DeletePhaseSchema = z.object({
  id: z.string().min(1),
});

// GET /api/phases?sequenceId=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const sequenceId = req.nextUrl.searchParams.get("sequenceId");
  const phases = await prisma.phase.findMany({
    where: { sequenceId: sequenceId ?? undefined },
    orderBy: { ordre: "asc" },
  });
  return NextResponse.json(phases);
}

// POST /api/phases — ajoute une phase à une séquence (niveau 2 minimum).
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreatePhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const phase = await prisma.phase.create({ data: parsed.data });
  return NextResponse.json(phase, { status: 201 });
}

// DELETE /api/phases — retire une phase ajoutée par erreur ou plus utile
// pour cette affaire (niveau 2 minimum, comme l'ajout). Refusé dès que la
// phase porte la moindre trace d'un travail réel (signature, avancement,
// document, photo, point réglementaire) : conformément au cahier des
// charges ("rien n'est jamais écrasé"), on ne supprime qu'un élément de
// planification encore vide, jamais un fait déjà survenu — une phase déjà
// avancée se marque NON_APPLICABLE (avec justification) plutôt que d'être
// supprimée.
export async function DELETE(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = DeletePhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const phase = await prisma.phase.findUnique({
    where: { id: parsed.data.id },
    include: {
      _count: {
        select: { photos: true, pointsReglementaires: true, pvExternes: true, documentsExternes: true, signaturesDetaillees: true },
      },
    },
  });
  if (!phase) {
    return NextResponse.json({ error: "Phase introuvable." }, { status: 404 });
  }

  const dejaUtilisee =
    phase.statut !== "A_FAIRE" ||
    phase.signatureId !== null ||
    phase._count.photos > 0 ||
    phase._count.pointsReglementaires > 0 ||
    phase._count.pvExternes > 0 ||
    phase._count.documentsExternes > 0 ||
    phase._count.signaturesDetaillees > 0;
  if (dejaUtilisee) {
    return NextResponse.json(
      { error: "Cette phase porte déjà un avancement ou des documents : elle ne peut plus être supprimée, seulement marquée non applicable." },
      { status: 409 }
    );
  }

  await prisma.phase.delete({ where: { id: phase.id } });
  await tracerModification({
    utilisateurId: droits.utilisateur.personnelId,
    entite: "Phase",
    entiteId: phase.id,
    ancienneValeur: { nom: phase.nom, sequenceId: phase.sequenceId, ordre: phase.ordre },
    nouvelleValeur: undefined,
    motif: "Phase supprimée (jamais utilisée).",
  });

  return NextResponse.json({ ok: true });
}

const UpdatePhaseSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["A_FAIRE", "EN_COURS", "TERMINEE", "NON_APPLICABLE"]).optional(),
  justificationNA: z.string().optional(),
  // Procédure interne applicable (voir le cahier des charges,
  // "DOCUMENTATION ET PROCÉDURES INTERNES") — null pour délier
  // explicitement. Indépendant du statut : peut se renseigner à tout
  // moment, pas seulement en même temps qu'un changement de statut.
  procedureInterneId: z.string().nullable().optional(),
  // Contrôle technique par phase (voir le cahier des charges, "FICHE DE
  // SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR PHASE") — facultatif,
  // indépendant du statut comme procedureInterneId ci-dessus.
  libelleControleTechnique: z.string().nullable().optional(),
  attendusControleTechnique: z.string().nullable().optional(),
  numeroAdrSpecifique: z.string().nullable().optional(),
});

// PATCH /api/phases — fait avancer une phase et/ou change la procédure
// interne applicable. Passer en EN_COURS ou TERMINEE est refusé si une
// séquence précédente de la même affaire n'est pas terminée, sauf
// dérogation accordée par une demande de modification de séquencement
// acceptée (voir src/lib/sequencement.ts), ou si un point du dossier
// réglementaire (voir src/lib/dossierReglementaire.ts) reste BLOQUANT pour
// cette phase ou pour l'affaire entière — seule la levée de ce point
// (jamais une dérogation de séquencement) débloque la phase. Passer en
// NON_APPLICABLE exige une justification, comme demandé au cahier des
// charges ("N/A avec justification").
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = UpdatePhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, statut, justificationNA, procedureInterneId, libelleControleTechnique, attendusControleTechnique, numeroAdrSpecifique } =
    parsed.data;

  if (statut === "NON_APPLICABLE" && !justificationNA?.trim()) {
    return NextResponse.json(
      { error: "Une justification est requise pour marquer une phase non applicable." },
      { status: 400 }
    );
  }

  const phaseAvant = await prisma.phase.findUnique({
    where: { id },
    include: { sequence: { select: { affaireId: true } } },
  });
  if (!phaseAvant) {
    return NextResponse.json({ error: "Phase introuvable." }, { status: 404 });
  }

  if (statut === "EN_COURS" || statut === "TERMINEE") {
    const { autorise, motif } = await verifierSequencementAutorise(id);
    if (!autorise) {
      return NextResponse.json({ error: motif }, { status: 422 });
    }

    const bloquants = await pointsBloquants(phaseAvant.sequence.affaireId, { phaseId: id });
    if (bloquants.length > 0) {
      return NextResponse.json(
        {
          error: `Point(s) réglementaire(s) bloquant(s) : ${bloquants.map((p) => p.intitule).join(", ")}.`,
        },
        { status: 422 }
      );
    }
  }

  if (procedureInterneId) {
    const procedure = await prisma.procedureInterne.findUnique({ where: { id: procedureInterneId } });
    if (!procedure) {
      return NextResponse.json({ error: "Procédure interne introuvable." }, { status: 422 });
    }
  }

  const phase = await prisma.phase.update({
    where: { id },
    data: {
      statut,
      justificationNA: statut === "NON_APPLICABLE" ? justificationNA : undefined,
      procedureInterneId: procedureInterneId === undefined ? undefined : procedureInterneId,
      libelleControleTechnique: libelleControleTechnique === undefined ? undefined : libelleControleTechnique,
      attendusControleTechnique: attendusControleTechnique === undefined ? undefined : attendusControleTechnique,
      numeroAdrSpecifique: numeroAdrSpecifique === undefined ? undefined : numeroAdrSpecifique,
    },
  });

  // Une phase n'a pas d'historique dédié (contrairement aux qualifications
  // ou au dossier réglementaire, événementiels) : c'est l'audit trail qui
  // trace son avancement et son lien vers une procédure, deux
  // "modifications sensibles" au sens du cahier des charges.
  if (phaseAvant.statut !== phase.statut || phaseAvant.procedureInterneId !== phase.procedureInterneId) {
    await tracerModification({
      utilisateurId: auth.utilisateur.personnelId,
      entite: "Phase",
      entiteId: phase.id,
      ancienneValeur: { statut: phaseAvant.statut, procedureInterneId: phaseAvant.procedureInterneId },
      nouvelleValeur: { statut: phase.statut, justificationNA: phase.justificationNA, procedureInterneId: phase.procedureInterneId },
    });
  }

  return NextResponse.json(phase);
}
