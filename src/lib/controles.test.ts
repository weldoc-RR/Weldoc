import { describe, it, expect } from "vitest";
import { calculerResultat, extraireConditionsExamen, type Indication } from "./controles";

function indication(conforme: boolean): Indication {
  return { localisation: "soudure", nature: "fissure", conforme };
}

describe("calculerResultat", () => {
  it("est CONFORME sans indication", () => {
    expect(calculerResultat([])).toBe("CONFORME");
  });

  it("est CONFORME quand toutes les indications sont conformes", () => {
    expect(calculerResultat([indication(true), indication(true)])).toBe("CONFORME");
  });

  it("est NON_CONFORME dès qu'une seule indication ne l'est pas", () => {
    expect(calculerResultat([indication(true), indication(false), indication(true)])).toBe("NON_CONFORME");
  });
});

describe("extraireConditionsExamen", () => {
  it("ne garde que les champs des conditions d'examen, en ignorant le reste", () => {
    const donnees = {
      numeroPV: "PV-001",
      referentielAcceptation: "CODAP",
      champInconnu: "ne doit pas apparaître",
    } as unknown as Parameters<typeof extraireConditionsExamen>[0];

    const resultat = extraireConditionsExamen(donnees);

    expect(resultat.numeroPV).toBe("PV-001");
    expect(resultat.referentielAcceptation).toBe("CODAP");
    expect(resultat).not.toHaveProperty("champInconnu");
  });

  it("laisse les champs absents à undefined plutôt que de les inventer", () => {
    const resultat = extraireConditionsExamen({});
    expect(resultat.numeroPV).toBeUndefined();
    expect(resultat.editionReferentiel).toBeUndefined();
  });
});
