import { describe, it, expect } from "vitest";
import { determinerCriteres, evaluerConformite } from "./tolerances";

describe("determinerCriteres", () => {
  it("refuse une norme non configurée plutôt que d'inventer une tolérance", () => {
    expect(() => determinerCriteres({ normeProduit: "NORME-INCONNUE", diametreNominalMm: 100, epaisseurNominaleMm: 5 })).toThrow(
      /Aucune règle de tolérance configurée/
    );
  });

  it("EXEMPLE-DEMO : ±0,5 mm sur le diamètre, ±10 % sur l'épaisseur", () => {
    const criteres = determinerCriteres({ normeProduit: "EXEMPLE-DEMO", diametreNominalMm: 100, epaisseurNominaleMm: 10 });
    expect(criteres.diametreMiniMm).toBeCloseTo(99.5);
    expect(criteres.diametreMaxiMm).toBeCloseTo(100.5);
    expect(criteres.epaisseurMiniMm).toBeCloseTo(9);
    expect(criteres.epaisseurMaxiMm).toBeCloseTo(11);
  });

  describe("EN 10216-2 (T nominale) — Tableau 7", () => {
    it("D ≤ 219,1 mm : tolérance épaisseur = max(12,5 % de T, 0,4 mm)", () => {
      const criteres = determinerCriteres({
        normeProduit: "EN 10216-2 (T nominale)",
        diametreNominalMm: 100,
        epaisseurNominaleMm: 4,
      });
      // tolérance diamètre = max(1% de 100, 0.5) = 1
      expect(criteres.diametreMiniMm).toBeCloseTo(99);
      expect(criteres.diametreMaxiMm).toBeCloseTo(101);
      // tolérance épaisseur = max(0.125*4, 0.4) = 0.5
      expect(criteres.epaisseurMiniMm).toBeCloseTo(3.5);
      expect(criteres.epaisseurMaxiMm).toBeCloseTo(4.5);
    });

    it("D > 219,1 mm avec un faible rapport T/D applique 20 % sur T", () => {
      // T/D = 5/300 ≈ 0.0167 ≤ 0.025 → 20 %
      const criteres = determinerCriteres({
        normeProduit: "EN 10216-2 (T nominale)",
        diametreNominalMm: 300,
        epaisseurNominaleMm: 5,
      });
      expect(criteres.epaisseurMiniMm).toBeCloseTo(5 - 5 * 0.2);
      expect(criteres.epaisseurMaxiMm).toBeCloseTo(5 + 5 * 0.2);
    });
  });

  describe("EN 10216-2 (Tmin) — Tableau 9", () => {
    it("l'épaisseur minimale reste exactement Tmin (tolérance uniquement positive)", () => {
      const criteres = determinerCriteres({
        normeProduit: "EN 10216-2 (Tmin)",
        diametreNominalMm: 100,
        epaisseurNominaleMm: 4,
      });
      expect(criteres.epaisseurMiniMm).toBe(4);
      expect(criteres.epaisseurMaxiMm).toBeGreaterThan(4);
    });
  });

  describe("EN 10216-2 (fini à froid) — Tableau 11", () => {
    it("ne dépend pas du rapport T/D, contrairement aux tableaux 7 et 9", () => {
      const criteres = determinerCriteres({
        normeProduit: "EN 10216-2 (fini à froid)",
        diametreNominalMm: 100,
        epaisseurNominaleMm: 4,
      });
      // tolérance diamètre = max(0.5% de 100, 0.3) = 0.5
      expect(criteres.diametreMiniMm).toBeCloseTo(99.5);
      expect(criteres.diametreMaxiMm).toBeCloseTo(100.5);
      // tolérance épaisseur = max(10% de 4, 0.2) = 0.4
      expect(criteres.epaisseurMiniMm).toBeCloseTo(3.6);
      expect(criteres.epaisseurMaxiMm).toBeCloseTo(4.4);
    });
  });
});

describe("evaluerConformite", () => {
  const criteres = determinerCriteres({ normeProduit: "EXEMPLE-DEMO", diametreNominalMm: 100, epaisseurNominaleMm: 10 });

  it("CONFORME quand toutes les mesures sont dans les tolérances", () => {
    expect(evaluerConformite([{ position: "0°", diametreMm: 100, epaisseurMm: 10 }], criteres)).toBe("CONFORME");
  });

  it("HORS_TOLERANCE quand le diamètre dépasse le maximum", () => {
    expect(evaluerConformite([{ position: "0°", diametreMm: 101 }], criteres)).toBe("HORS_TOLERANCE");
  });

  it("HORS_TOLERANCE quand l'épaisseur est sous le minimum", () => {
    expect(evaluerConformite([{ position: "0°", epaisseurMm: 8 }], criteres)).toBe("HORS_TOLERANCE");
  });

  it("une seule mesure hors tolérance parmi plusieurs suffit à rendre le contrôle HORS_TOLERANCE", () => {
    const mesures = [
      { position: "0°", diametreMm: 100, epaisseurMm: 10 },
      { position: "90°", diametreMm: 100, epaisseurMm: 20 },
    ];
    expect(evaluerConformite(mesures, criteres)).toBe("HORS_TOLERANCE");
  });
});
