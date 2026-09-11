// Type partagé pour une indication de contrôle (visuel, ressuage,
// magnétoscopie, radiographie, ultrasons — voir src/lib/controles.ts),
// entre les formulaires de saisie et leur composant d'édition.
export interface IndicationFormulaire {
  localisation: string;
  nature: string;
  dimensions: string;
  critereApplicable: string;
  conforme: boolean;
  commentaire: string;
  photoUrl: string;
}

export function indicationVide(): IndicationFormulaire {
  return {
    localisation: "",
    nature: "",
    dimensions: "",
    critereApplicable: "",
    conforme: true,
    commentaire: "",
    photoUrl: "",
  };
}

export function indicationVersJson(i: IndicationFormulaire) {
  return {
    localisation: i.localisation,
    nature: i.nature,
    dimensions: i.dimensions || undefined,
    critereApplicable: i.critereApplicable || undefined,
    conforme: i.conforme,
    commentaire: i.commentaire || undefined,
    photoUrl: i.photoUrl || undefined,
  };
}
