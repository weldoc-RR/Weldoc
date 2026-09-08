import { prisma } from "@/lib/prisma";
import { calculerStatutOutil } from "@/lib/statutOutil";

export type RecapitulatifAlertes = {
  outilsBientotEcheance: { reference: string; type: string; dateEcheance: Date }[];
  outilsExpires: { reference: string; type: string; dateEcheance: Date }[];
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

  return { outilsBientotEcheance, outilsExpires };
}

function ligneOutil(o: { reference: string; type: string; dateEcheance: Date }): string {
  return `${o.reference} (${o.type}) — échéance ${o.dateEcheance.toLocaleDateString("fr-FR")}`;
}

export function contenuEmailRecapitulatif(recap: RecapitulatifAlertes): { sujet: string; texte: string; html: string } {
  const total = recap.outilsExpires.length + recap.outilsBientotEcheance.length;
  const sujet = `Weldoc — Récapitulatif hebdomadaire des alertes outillage (${total})`;

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

  const texte =
    total === 0
      ? "Aucune alerte outillage cette semaine."
      : sections.join("\n\n") + "\n\nDétail complet dans Weldoc, page Alertes.";

  const html =
    total === 0
      ? "<p>Aucune alerte outillage cette semaine.</p>"
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
