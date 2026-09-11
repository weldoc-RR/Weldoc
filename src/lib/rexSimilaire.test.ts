import { describe, it, expect } from "vitest";
import { problematiquesSimilaires, type CriteresRex } from "./rexSimilaire";

function fiche(overrides: Partial<CriteresRex> & { ficheId: string }): CriteresRex {
  return {
    matiereNuance: null,
    matiereFournisseur: null,
    procede: null,
    typeJoint: null,
    chantier: null,
    ...overrides,
  };
}

describe("problematiquesSimilaires", () => {
  it("ne trouve aucune similitude quand rien ne correspond", () => {
    const a = fiche({ ficheId: "a", matiereNuance: "316L" });
    const b = fiche({ ficheId: "b", matiereNuance: "P265GH" });
    const resultat = problematiquesSimilaires([a, b]);
    expect(resultat.get("a")).toEqual([]);
    expect(resultat.get("b")).toEqual([]);
  });

  it("détecte une correspondance sur un seul critère", () => {
    const a = fiche({ ficheId: "a", matiereNuance: "316L" });
    const b = fiche({ ficheId: "b", matiereNuance: "316L" });
    const resultat = problematiquesSimilaires([a, b]);
    expect(resultat.get("a")).toEqual([{ ficheId: "b", criteresCommuns: ["matière"] }]);
    expect(resultat.get("b")).toEqual([{ ficheId: "a", criteresCommuns: ["matière"] }]);
  });

  it("un champ vide des deux côtés (null/null) n'est jamais une correspondance", () => {
    const a = fiche({ ficheId: "a" });
    const b = fiche({ ficheId: "b" });
    const resultat = problematiquesSimilaires([a, b]);
    expect(resultat.get("a")).toEqual([]);
  });

  it("la comparaison ignore la casse et les espaces superflus", () => {
    const a = fiche({ ficheId: "a", procede: " 141 " });
    const b = fiche({ ficheId: "b", procede: "141" });
    const resultat = problematiquesSimilaires([a, b]);
    expect(resultat.get("a")?.[0].criteresCommuns).toEqual(["procédé"]);
  });

  it("cumule les critères communs (matière + procédé + chantier)", () => {
    const a = fiche({ ficheId: "a", matiereNuance: "316L", procede: "141", chantier: "EDF Flamanville" });
    const b = fiche({ ficheId: "b", matiereNuance: "316L", procede: "141", chantier: "EDF Flamanville" });
    const resultat = problematiquesSimilaires([a, b]);
    expect(resultat.get("a")?.[0].criteresCommuns).toEqual(["matière", "procédé", "chantier"]);
  });

  it("trie par nombre de critères communs décroissant", () => {
    const cible = fiche({ ficheId: "cible", matiereNuance: "316L", procede: "141", typeJoint: "BW" });
    const unCritere = fiche({ ficheId: "un-critere", matiereNuance: "316L" });
    const troisCriteres = fiche({ ficheId: "trois-criteres", matiereNuance: "316L", procede: "141", typeJoint: "BW" });
    const deuxCriteres = fiche({ ficheId: "deux-criteres", matiereNuance: "316L", procede: "141" });

    const resultat = problematiquesSimilaires([cible, unCritere, troisCriteres, deuxCriteres]);
    const ordre = resultat.get("cible")!.map((s) => s.ficheId);
    expect(ordre).toEqual(["trois-criteres", "deux-criteres", "un-critere"]);
  });

  it("n'inclut jamais une fiche par rapport à elle-même", () => {
    const a = fiche({ ficheId: "a", matiereNuance: "316L" });
    const resultat = problematiquesSimilaires([a]);
    expect(resultat.get("a")).toEqual([]);
  });
});
