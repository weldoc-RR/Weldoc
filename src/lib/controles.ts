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

// Champs propres au procès-verbal lui-même (numéro, critères d'acceptation,
// conditions d'examen), partagés par les 5 méthodes de contrôle à
// indications (visuel, ressuage, magnétoscopie, radiographie, ultrasons).
// Tout facultatif et en texte libre : les valeurs possibles dépendent du
// référentiel de l'entreprise, jamais imposées par Weldoc. Le type de
// joint, le diamètre, l'épaisseur et la matière restent sur Joint et ne
// sont jamais redemandés ici (voir le PRINCIPE CENTRAL du cahier des
// charges).
export const ConditionsExamenSchema = z.object({
  numeroPV: z.string().optional(),
  referentielAcceptation: z.string().optional(),
  editionReferentiel: z.string().optional(),
  categorieConstruction: z.string().optional(),
  niveauExamen: z.string().optional(),
  methodeExamen: z.string().optional(),
  surfacesExaminees: z.string().optional(),
  etatSurface: z.string().optional(),
  eclairage: z.string().optional(),
  moyensUtilises: z.string().optional(),
});

export type ConditionsExamen = z.infer<typeof ConditionsExamenSchema>;

export function extraireConditionsExamen(data: ConditionsExamen): ConditionsExamen {
  const {
    numeroPV,
    referentielAcceptation,
    editionReferentiel,
    categorieConstruction,
    niveauExamen,
    methodeExamen,
    surfacesExaminees,
    etatSurface,
    eclairage,
    moyensUtilises,
  } = data;
  return {
    numeroPV,
    referentielAcceptation,
    editionReferentiel,
    categorieConstruction,
    niveauExamen,
    methodeExamen,
    surfacesExaminees,
    etatSurface,
    eclairage,
    moyensUtilises,
  };
}

// Le résultat global est déduit des indications plutôt que saisi
// directement : une seule indication hors critères suffit à rendre le
// contrôle non conforme (et donc, potentiellement, à déclencher une FNC).
export function calculerResultat(indications: Indication[]): ResultatControle {
  if (indications.some((i) => !i.conforme)) return "NON_CONFORME";
  return "CONFORME";
}
