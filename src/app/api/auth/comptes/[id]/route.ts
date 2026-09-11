import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";
import { tracerModification } from "@/lib/auditTrail";

const UpdateStatutSchema = z.object({
  statut: z.enum(["ACTIF", "SUSPENDU"]),
});

// PATCH /api/auth/comptes/[id] — suspend ou réactive un compte (voir le
// cahier des charges, "DROITS ET MODIFICATIONS"). Réservé au niveau 3.
// Un compte suspendu perd l'accès immédiatement : chaque requête
// re-vérifie le statut du compte (voir src/lib/auth.ts,
// `session.compte.statut !== "ACTIF"`), pas seulement à la connexion.
// Une personne ne peut pas se suspendre elle-même, pour éviter un
// verrouillage accidentel. Tracé par l'audit trail.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = UpdateStatutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const avant = await prisma.compte.findUnique({ where: { id: params.id } });
  if (!avant) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }
  if (avant.personnelId === droits.utilisateur.personnelId && parsed.data.statut === "SUSPENDU") {
    return NextResponse.json({ error: "Impossible de suspendre son propre compte." }, { status: 422 });
  }

  const compte = await prisma.compte.update({ where: { id: params.id }, data: { statut: parsed.data.statut } });

  if (avant.statut !== compte.statut) {
    await tracerModification({
      utilisateurId: droits.utilisateur.personnelId,
      entite: "Compte",
      entiteId: compte.id,
      ancienneValeur: { statut: avant.statut },
      nouvelleValeur: { statut: compte.statut },
    });
  }

  return NextResponse.json({ id: compte.id, personnelId: compte.personnelId, statut: compte.statut });
}
