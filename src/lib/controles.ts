import { z } from "zod";
import type { ResultatControle } from "@prisma/client";

// Forme commune d'une indication, pour le contrôle visuel comme pour les
// méthodes CND (ressuage, puis magnétoscopie/radio/ultrasons plus tard).
// Une indication n'est pas nécessairement une non-conformité : elle reste
// documentée même quand elle est conforme.
export const IndicationSchema = z.object({
  localisation: z.string().min(1),
  nature: z.string().min(1),
  dimensions: z.string().optional(),
  critereApplicable: z.string().optional(),
  conforme: z.boolean(),
  commentaire: z.string().optional(),
  photoUrl: z.string().optional(),
});

export type Indication = z.infer<typeof IndicationSchema>;

// Le résultat global est déduit des indications plutôt que saisi
// directement : une seule indication hors critères suffit à rendre le
// contrôle non conforme (et donc, potentiellement, à déclencher une FNC).
export function calculerResultat(indications: Indication[]): ResultatControle {
  if (indications.some((i) => !i.conforme)) return "NON_CONFORME";
  return "CONFORME";
}
