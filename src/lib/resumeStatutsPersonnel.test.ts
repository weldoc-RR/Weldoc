import { describe, it, expect } from "vitest";
import { compterAlertesStatuts } from "./resumeStatutsPersonnel";

describe("compterAlertesStatuts", () => {
  it("ne compte rien sur une liste vide", () => {
    expect(compterAlertesStatuts([])).toEqual({ urgentes: 0, bientotEcheance: 0 });
  });

  it("ne compte rien pour des statuts tous VALIDE", () => {
    expect(compterAlertesStatuts(["VALIDE", "VALIDE"])).toEqual({ urgentes: 0, bientotEcheance: 0 });
  });

  it("compte EXPIRE et SUSPENDU comme urgentes", () => {
    expect(compterAlertesStatuts(["EXPIRE", "SUSPENDU", "VALIDE"])).toEqual({ urgentes: 2, bientotEcheance: 0 });
  });

  it("compte BIENTOT_ECHEANCE et EN_RENOUVELLEMENT comme bientôt à échéance", () => {
    expect(compterAlertesStatuts(["BIENTOT_ECHEANCE", "EN_RENOUVELLEMENT", "VALIDE"])).toEqual({
      urgentes: 0,
      bientotEcheance: 2,
    });
  });

  it("cumule les deux catégories sur une liste mixte", () => {
    expect(compterAlertesStatuts(["EXPIRE", "BIENTOT_ECHEANCE", "VALIDE", "SUSPENDU"])).toEqual({
      urgentes: 2,
      bientotEcheance: 1,
    });
  });
});
