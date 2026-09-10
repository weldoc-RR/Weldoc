import { describe, it, expect } from "vitest";
import { calculerStatut, SEUIL_BIENTOT_ECHEANCE_JOURS } from "./statutValidite";

describe("calculerStatut", () => {
  const aujourdHui = new Date("2026-01-01T00:00:00.000Z");

  it("est VALIDE sans date d'expiration", () => {
    expect(calculerStatut(null, { aujourdHui })).toBe("VALIDE");
  });

  it("est VALIDE largement avant l'échéance", () => {
    const dans1An = new Date("2027-01-01T00:00:00.000Z");
    expect(calculerStatut(dans1An, { aujourdHui })).toBe("VALIDE");
  });

  it("est BIENTOT_ECHEANCE juste avant le seuil", () => {
    const dansLeSeuil = new Date(aujourdHui.getTime() + (SEUIL_BIENTOT_ECHEANCE_JOURS - 1) * 24 * 60 * 60 * 1000);
    expect(calculerStatut(dansLeSeuil, { aujourdHui })).toBe("BIENTOT_ECHEANCE");
  });

  it("est VALIDE juste après le seuil", () => {
    const apresLeSeuil = new Date(aujourdHui.getTime() + (SEUIL_BIENTOT_ECHEANCE_JOURS + 1) * 24 * 60 * 60 * 1000);
    expect(calculerStatut(apresLeSeuil, { aujourdHui })).toBe("VALIDE");
  });

  it("est EXPIRE une fois la date dépassée", () => {
    const hier = new Date(aujourdHui.getTime() - 24 * 60 * 60 * 1000);
    expect(calculerStatut(hier, { aujourdHui })).toBe("EXPIRE");
  });

  it("est SUSPENDU même avec une date d'expiration future, dès que suspendu est vrai", () => {
    const dans1An = new Date("2027-01-01T00:00:00.000Z");
    expect(calculerStatut(dans1An, { aujourdHui, suspendu: true })).toBe("SUSPENDU");
  });

  it("SUSPENDU prend le pas même sans date d'expiration", () => {
    expect(calculerStatut(null, { aujourdHui, suspendu: true })).toBe("SUSPENDU");
  });
});
