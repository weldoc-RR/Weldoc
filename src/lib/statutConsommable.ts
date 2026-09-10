import { prisma } from "@/lib/prisma";
import { SEUIL_BIENTOT_ECHEANCE_JOURS } from "@/lib/statutValidite";

// Même principe que calculerStatutOutil (src/lib/statutOutil.ts), appliqué
// aux consommables CND : la date de péremption reste la seule source de
// vérité, jamais un statut stocké qui pourrait devenir périmé.
export type StatutAffichageConsommable = "VALIDE" | "BIENTOT_ECHEANCE" | "PERIME";

export function calculerStatutConsommable(
  peremption: Date | null,
  options: { aujourdHui?: Date } = {}
): StatutAffichageConsommable {
  if (!peremption) return "VALIDE";

  const aujourdHui = options.aujourdHui ?? new Date();
  const joursRestants = Math.ceil((peremption.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24));

  if (joursRestants < 0) return "PERIME";
  if (joursRestants <= SEUIL_BIENTOT_ECHEANCE_JOURS) return "BIENTOT_ECHEANCE";
  return "VALIDE";
}

export function consommableUtilisable(statut: StatutAffichageConsommable): boolean {
  return statut === "VALIDE" || statut === "BIENTOT_ECHEANCE";
}

// Vérification partagée par les quatre contrôles CND qui rattachent des
// consommables au PV (ressuage, magnétoscopie, radiographie, ultrasons —
// voir le cahier des charges, "CONSOMMABLES CND"). Un produit périmé
// bloque le contrôle, même principe et même position dans le code que
// verifierOutilPourControle (src/lib/statutOutil.ts) : ce n'est pas une
// décision réglementaire, juste un fait — un ressuage fait avec un
// pénétrant périmé n'est pas exploitable.
export async function verifierConsommablesPourControle(
  consommableIds: string[] | undefined
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!consommableIds || consommableIds.length === 0) return { ok: true };

  const consommables = await prisma.consommableCND.findMany({ where: { id: { in: consommableIds } } });
  for (const c of consommables) {
    const statut = calculerStatutConsommable(c.peremption);
    if (!consommableUtilisable(statut)) {
      return {
        ok: false,
        erreur: `Consommable "${c.fabricant} ${c.reference}" (lot ${c.lot}) périmé : contrôle refusé.`,
      };
    }
  }
  return { ok: true };
}
