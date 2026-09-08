// Champs partagés par les 5 méthodes de contrôle à indications (voir
// ConditionsExamenSchema dans src/lib/controles.ts) : propres au
// procès-verbal lui-même, tous facultatifs et en texte libre.
export interface ConditionsExamenFormulaire {
  numeroPV: string;
  referentielAcceptation: string;
  editionReferentiel: string;
  categorieConstruction: string;
  niveauExamen: string;
  methodeExamen: string;
  surfacesExaminees: string;
  etatSurface: string;
  eclairage: string;
  moyensUtilises: string;
}

export function conditionsExamenVide(): ConditionsExamenFormulaire {
  return {
    numeroPV: "",
    referentielAcceptation: "",
    editionReferentiel: "",
    categorieConstruction: "",
    niveauExamen: "",
    methodeExamen: "",
    surfacesExaminees: "",
    etatSurface: "",
    eclairage: "",
    moyensUtilises: "",
  };
}

export function conditionsExamenVersJson(c: ConditionsExamenFormulaire) {
  return {
    numeroPV: c.numeroPV || undefined,
    referentielAcceptation: c.referentielAcceptation || undefined,
    editionReferentiel: c.editionReferentiel || undefined,
    categorieConstruction: c.categorieConstruction || undefined,
    niveauExamen: c.niveauExamen || undefined,
    methodeExamen: c.methodeExamen || undefined,
    surfacesExaminees: c.surfacesExaminees || undefined,
    etatSurface: c.etatSurface || undefined,
    eclairage: c.eclairage || undefined,
    moyensUtilises: c.moyensUtilises || undefined,
  };
}
