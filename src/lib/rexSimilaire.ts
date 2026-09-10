// "Identification de problématiques similaires" (voir le cahier des
// charges, "RETOUR D'EXPÉRIENCE (REX)") : jusqu'ici seul un filtre manuel
// par type de problème existait sur /rex. Ceci compare chaque fiche REX
// aux autres sur les cinq critères déjà prévus au cahier des charges pour
// le classement REX (matériau, fournisseur, procédé, type de joint,
// chantier) — tous déjà lisibles sur le joint/l'affaire de la FNC, rien
// n'est ressaisi ni stocké ici. Purement une aide au rapprochement,
// jamais un diagnostic automatique : Weldoc ne dit jamais "c'est le même
// problème", seulement "ces fiches partagent tel ou tel critère" — à la
// personne qui consulte d'en juger la pertinence.

export type CriteresRex = {
  ficheId: string;
  matiereNuance: string | null;
  matiereFournisseur: string | null;
  procede: string | null;
  typeJoint: string | null;
  chantier: string | null;
};

export type FicheSimilaire = {
  ficheId: string;
  criteresCommuns: string[];
};

function normalise(valeur: string | null): string | null {
  const v = valeur?.trim().toLowerCase();
  return v ? v : null;
}

function correspond(a: string | null, b: string | null): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  return na !== null && nb !== null && na === nb;
}

// Pour chaque fiche, les autres fiches partageant au moins un critère,
// triées par nombre de critères communs décroissant (le classement
// pressenti par le cahier des charges : "matériau/procédé/fournisseur/
// type de joint/chantier").
export function problematiquesSimilaires(fiches: CriteresRex[]): Map<string, FicheSimilaire[]> {
  const resultat = new Map<string, FicheSimilaire[]>();

  for (const a of fiches) {
    const similitudes: FicheSimilaire[] = [];
    for (const b of fiches) {
      if (a.ficheId === b.ficheId) continue;

      const criteresCommuns: string[] = [];
      if (correspond(a.matiereNuance, b.matiereNuance)) criteresCommuns.push("matière");
      if (correspond(a.matiereFournisseur, b.matiereFournisseur)) criteresCommuns.push("fournisseur");
      if (correspond(a.procede, b.procede)) criteresCommuns.push("procédé");
      if (correspond(a.typeJoint, b.typeJoint)) criteresCommuns.push("type de joint");
      if (correspond(a.chantier, b.chantier)) criteresCommuns.push("chantier");

      if (criteresCommuns.length > 0) similitudes.push({ ficheId: b.ficheId, criteresCommuns });
    }

    similitudes.sort((x, y) => y.criteresCommuns.length - x.criteresCommuns.length);
    resultat.set(a.ficheId, similitudes);
  }

  return resultat;
}
