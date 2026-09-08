import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";

export type AlerteOutil = {
  type: "OUTIL_BIENTOT_ECHEANCE" | "OUTIL_EXPIRE";
  outilId: string;
  reference: string;
  outilType: string;
  dateEcheance: string;
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

  return NextResponse.json({ alertes });
}
