import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";
import { calculerProchaineConfirmation } from "@/lib/confirmationQualification";

export type AlerteOutil = {
  type: "OUTIL_BIENTOT_ECHEANCE" | "OUTIL_EXPIRE";
  outilId: string;
  reference: string;
  outilType: string;
  dateEcheance: string;
  message: string;
};

export type AlerteConfirmationQualification = {
  type: "CONFIRMATION_QUALIFICATION_BIENTOT_DUE" | "CONFIRMATION_QUALIFICATION_EN_RETARD";
  qualificationId: string;
  personnel: string;
  reference: string;
  prochaineDateDue: string;
  message: string;
};

export type AlerteReconductionProposee = {
  type: "RECONDUCTION_PROPOSEE";
  qualificationId: string;
  personnel: string;
  reference: string;
  dateProposition: string;
  message: string;
};

// GET /api/alertes — outils de métrologie dont la vérification arrive à
// échéance ou est déjà dépassée (le cahier des charges liste "outils
// métrologiques expirés" parmi les alertes à signaler). Calculé en direct
// à partir des dates, jamais stocké, pour rester exact à chaque appel.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const outils = await prisma.outil.findMany({ where: { statut: { not: "HORS_SERVICE" } } });

  const alertes: AlerteOutil[] = [];
  for (const outil of outils) {
    const statut = calculerStatutOutil(outil.dateEcheance);
    if (statut !== "EXPIRE" && statut !== "BIENTOT_ECHEANCE") continue;
    if (!outil.dateEcheance) continue;

    alertes.push({
      type: statut === "EXPIRE" ? "OUTIL_EXPIRE" : "OUTIL_BIENTOT_ECHEANCE",
      outilId: outil.id,
      reference: outil.reference,
      outilType: outil.type,
      dateEcheance: outil.dateEcheance.toISOString(),
      message:
        statut === "EXPIRE"
          ? `Vérification de "${outil.reference}" (${outil.type}) expirée depuis le ${outil.dateEcheance.toLocaleDateString("fr-FR")}.`
          : `Vérification de "${outil.reference}" (${outil.type}) à renouveler avant le ${outil.dateEcheance.toLocaleDateString("fr-FR")}.`,
    });
  }

  alertes.sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance));

  const qualifications = await prisma.qualification.findMany({
    where: { statut: { not: "SUSPENDU" }, frequenceConfirmationMois: { not: null } },
    include: { personnel: { select: { nom: true, prenom: true } }, evenements: true },
  });

  const alertesConfirmation: AlerteConfirmationQualification[] = [];
  for (const q of qualifications) {
    const datesConfirmations = q.evenements.filter((e) => e.type === "CONFIRMATION_VALIDITE").map((e) => e.date);
    const confirmation = calculerProchaineConfirmation(q.frequenceConfirmationMois, q.dateObtention, datesConfirmations);
    if (!confirmation.prochaineDateDue || (!confirmation.enRetard && !confirmation.bientotDue)) continue;

    const nom = `${q.personnel.prenom} ${q.personnel.nom}`;
    const dateTexte = confirmation.prochaineDateDue.toLocaleDateString("fr-FR");
    alertesConfirmation.push({
      type: confirmation.enRetard ? "CONFIRMATION_QUALIFICATION_EN_RETARD" : "CONFIRMATION_QUALIFICATION_BIENTOT_DUE",
      qualificationId: q.id,
      personnel: nom,
      reference: q.reference,
      prochaineDateDue: confirmation.prochaineDateDue.toISOString(),
      message: confirmation.enRetard
        ? `Confirmation de validité de "${q.reference}" (${nom}) en retard depuis le ${dateTexte}.`
        : `Confirmation de validité de "${q.reference}" (${nom}) à faire avant le ${dateTexte}.`,
    });
  }
  alertesConfirmation.sort((a, b) => a.prochaineDateDue.localeCompare(b.prochaineDateDue));

  // Reconductions proposées automatiquement (voir
  // src/lib/qualifications.ts), en attente d'une décision niveau 3 —
  // signalées ici pour ne pas rester invisibles tant que personne n'ouvre
  // la fiche de la personne concernée.
  const qualificationsAvecEvenements = await prisma.qualification.findMany({
    where: { statut: { not: "SUSPENDU" } },
    include: { personnel: { select: { nom: true, prenom: true } }, evenements: { orderBy: { date: "desc" }, take: 1 } },
  });

  const alertesReconduction: AlerteReconductionProposee[] = [];
  for (const q of qualificationsAvecEvenements) {
    const dernier = q.evenements[0];
    if (dernier?.type !== "RECONDUCTION_PROPOSEE") continue;

    const nom = `${q.personnel.prenom} ${q.personnel.nom}`;
    alertesReconduction.push({
      type: "RECONDUCTION_PROPOSEE",
      qualificationId: q.id,
      personnel: nom,
      reference: q.reference,
      dateProposition: dernier.date.toISOString(),
      message: `Reconduction de "${q.reference}" (${nom}) proposée le ${dernier.date.toLocaleDateString("fr-FR")}, en attente de validation.`,
    });
  }
  alertesReconduction.sort((a, b) => a.dateProposition.localeCompare(b.dateProposition));

  return NextResponse.json({
    alertes,
    alertesConfirmationQualification: alertesConfirmation,
    alertesReconductionProposee: alertesReconduction,
  });
}
