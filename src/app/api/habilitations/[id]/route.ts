import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";
import { tracerModification } from "@/lib/auditTrail";

const UpdateStatutSchema = z.object({
  statut: z.enum(["VALIDE", "SUSPENDU"]),
  motif: z.string().optional(),
});

// PATCH /api/habilitations/[id] — suspend ou réactive une habilitation,
// réservé au niveau 3. Contrairement aux qualifications (dont la
// suspension est un événement dans un historique dédié,
// QualificationEvenement, avec ses propres étapes de reconduction), une
// habilitation n'a pas ce workflow au cahier des charges : ici, un simple
// changement de statut, tracé par l'audit trail — même principe que la
// suspension d'un compte (voir PATCH /api/auth/comptes/[id]). Une
// habilitation suspendue bloque comme une habilitation expirée (voir
// src/lib/aptitudePersonnel.ts, verifierHabilitationsBloquantes) : toutes
// les habilitations enregistrées doivent être valides, une seule
// suspendue suffit à bloquer.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = UpdateStatutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.statut === "SUSPENDU" && !parsed.data.motif) {
    return NextResponse.json({ error: "Le motif de suspension est obligatoire." }, { status: 400 });
  }

  const avant = await prisma.habilitation.findUnique({ where: { id: params.id } });
  if (!avant) {
    return NextResponse.json({ error: "Habilitation introuvable." }, { status: 404 });
  }

  const habilitation = await prisma.habilitation.update({
    where: { id: params.id },
    data: { statut: parsed.data.statut },
  });

  if (avant.statut !== habilitation.statut) {
    await tracerModification({
      utilisateurId: droits.utilisateur.personnelId,
      entite: "Habilitation",
      entiteId: habilitation.id,
      ancienneValeur: { statut: avant.statut },
      nouvelleValeur: { statut: habilitation.statut },
      motif: parsed.data.motif,
    });
  }

  return NextResponse.json(habilitation);
}
