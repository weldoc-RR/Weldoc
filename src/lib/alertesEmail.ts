import { prisma } from "@/lib/prisma";
import { calculerStatutOutil } from "@/lib/statutOutil";
import { calculerProchaineConfirmation } from "@/lib/confirmationQualification";

export type RecapitulatifAlertes = {
  outilsBientotEcheance: { reference: string; type: string; dateEcheance: Date }[];
  outilsExpires: { reference: string; type: string; dateEcheance: Date }[];
  confirmationsQualificationDues: { personnel: string; reference: string; prochaineDateDue: Date }[];
  confirmationsQualificationEnRetard: { personnel: string; reference: string; prochaineDateDue: Date }[];
  reconductionsProposees: { personnel: string; reference: string; dateProposition: Date }[];
};

export async function construireRecapitulatif(): Promise<RecapitulatifAlertes> {
  const outils = await prisma.outil.findMany({ where: { statut: { not: "HORS_SERVICE" } } });

  const outilsBientotEcheance: RecapitulatifAlertes["outilsBientotEcheance"] = [];
  const outilsExpires: RecapitulatifAlertes["outilsExpires"] = [];

  for (const outil of outils) {
    if (!outil.dateEcheance) continue;
    const statut = calculerStatutOutil(outil.dateEcheance);
    if (statut === "BIENTOT_ECHEANCE") {
      outilsBientotEcheance.push({ reference: outil.reference, type: outil.type, dateEcheance: outil.dateEcheance });
    } else if (statut === "EXPIRE") {
      outilsExpires.push({ reference: outil.reference, type: outil.type, dateEcheance: outil.dateEcheance });
    }
  }

  const qualifications = await prisma.qualification.findMany({
    where: { statut: { not: "SUSPENDU" }, frequenceConfirmationMois: { not: null } },
    include: { personnel: { select: { nom: true, prenom: true } }, evenements: true },
  });

  const confirmationsQualificationDues: RecapitulatifAlertes["confirmationsQualificationDues"] = [];
  const confirmationsQualificationEnRetard: RecapitulatifAlertes["confirmationsQualificationEnRetard"] = [];

  for (const q of qualifications) {
    const datesConfirmations = q.evenements.filter((e) => e.type === "CONFIRMATION_VALIDITE").map((e) => e.date);
    const confirmation = calculerProchaineConfirmation(q.frequenceConfirmationMois, q.dateObtention, datesConfirmations);
    if (!confirmation.prochaineDateDue) continue;
    const ligne = {
      personnel: `${q.personnel.prenom} ${q.personnel.nom}`,
      reference: q.reference,
      prochaineDateDue: confirmation.prochaineDateDue,
    };
    if (confirmation.enRetard) confirmationsQualificationEnRetard.push(ligne);
    else if (confirmation.bientotDue) confirmationsQualificationDues.push(ligne);
  }

  const qualificationsToutes = await prisma.qualification.findMany({
    where: { statut: { not: "SUSPENDU" } },
    include: { personnel: { select: { nom: true, prenom: true } }, evenements: { orderBy: { date: "desc" }, take: 1 } },
  });
  const reconductionsProposees: RecapitulatifAlertes["reconductionsProposees"] = [];
  for (const q of qualificationsToutes) {
    const dernier = q.evenements[0];
    if (dernier?.type !== "RECONDUCTION_PROPOSEE") continue;
    reconductionsProposees.push({
      personnel: `${q.personnel.prenom} ${q.personnel.nom}`,
      reference: q.reference,
      dateProposition: dernier.date,
    });
  }

  return {
    outilsBientotEcheance,
    outilsExpires,
    confirmationsQualificationDues,
    confirmationsQualificationEnRetard,
    reconductionsProposees,
  };
}

function ligneOutil(o: { reference: string; type: string; dateEcheance: Date }): string {
  return `${o.reference} (${o.type}) — échéance ${o.dateEcheance.toLocaleDateString("fr-FR")}`;
}

function ligneConfirmation(c: { personnel: string; reference: string; prochaineDateDue: Date }): string {
  return `${c.reference} (${c.personnel}) — confirmation due le ${c.prochaineDateDue.toLocaleDateString("fr-FR")}`;
}

function ligneReconduction(r: { personnel: string; reference: string; dateProposition: Date }): string {
  return `${r.reference} (${r.personnel}) — proposée le ${r.dateProposition.toLocaleDateString("fr-FR")}, en attente de validation`;
}

export function contenuEmailRecapitulatif(recap: RecapitulatifAlertes): { sujet: string; texte: string; html: string } {
  const total =
    recap.outilsExpires.length +
    recap.outilsBientotEcheance.length +
    recap.confirmationsQualificationEnRetard.length +
    recap.confirmationsQualificationDues.length +
    recap.reconductionsProposees.length;
  const sujet = `Weldoc — Récapitulatif hebdomadaire des alertes (${total})`;

  const sections: string[] = [];
  if (recap.outilsExpires.length > 0) {
    sections.push(
      `Outils avec vérification expirée (${recap.outilsExpires.length}) :\n` +
        recap.outilsExpires.map((o) => `- ${ligneOutil(o)}`).join("\n")
    );
  }
  if (recap.outilsBientotEcheance.length > 0) {
    sections.push(
      `Outils bientôt à échéance (${recap.outilsBientotEcheance.length}) :\n` +
        recap.outilsBientotEcheance.map((o) => `- ${ligneOutil(o)}`).join("\n")
    );
  }
  if (recap.confirmationsQualificationEnRetard.length > 0) {
    sections.push(
      `Confirmations de validité de qualification en retard (${recap.confirmationsQualificationEnRetard.length}) :\n` +
        recap.confirmationsQualificationEnRetard.map((c) => `- ${ligneConfirmation(c)}`).join("\n")
    );
  }
  if (recap.confirmationsQualificationDues.length > 0) {
    sections.push(
      `Confirmations de validité de qualification bientôt dues (${recap.confirmationsQualificationDues.length}) :\n` +
        recap.confirmationsQualificationDues.map((c) => `- ${ligneConfirmation(c)}`).join("\n")
    );
  }
  if (recap.reconductionsProposees.length > 0) {
    sections.push(
      `Reconductions de qualification proposées, en attente de validation (${recap.reconductionsProposees.length}) :\n` +
        recap.reconductionsProposees.map((r) => `- ${ligneReconduction(r)}`).join("\n")
    );
  }

  const texte =
    total === 0
      ? "Aucune alerte cette semaine."
      : sections.join("\n\n") + "\n\nDétail complet dans Weldoc, page Alertes.";

  const html =
    total === 0
      ? "<p>Aucune alerte cette semaine.</p>"
      : sections
          .map(
            (s) =>
              `<p>${s
                .split("\n")
                .map((l) => l.replace(/^- /, "&bull; "))
                .join("<br>")}</p>`
          )
          .join("") + "<p>Détail complet dans Weldoc, page Alertes.</p>";

  return { sujet, texte, html };
}
