import { describe, it, expect, vi, beforeEach } from "vitest";

// Même raison que dans aptitudePersonnel.test.ts : @/lib/prisma ouvre une
// vraie connexion Neon dès son import, on le simule pour tester la logique
// pure sans toucher à la base de données.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    consommableCND: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { calculerStatutConsommable, consommableUtilisable, verifierConsommablesPourControle } from "./statutConsommable";
import { SEUIL_BIENTOT_ECHEANCE_JOURS } from "./statutValidite";

const findManyConsommable = prisma.consommableCND.findMany as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findManyConsommable.mockReset();
});

describe("calculerStatutConsommable", () => {
  const aujourdHui = new Date("2026-01-01T00:00:00.000Z");

  it("est VALIDE sans date de péremption", () => {
    expect(calculerStatutConsommable(null, { aujourdHui })).toBe("VALIDE");
  });

  it("est VALIDE largement avant la péremption", () => {
    const dans1An = new Date("2027-01-01T00:00:00.000Z");
    expect(calculerStatutConsommable(dans1An, { aujourdHui })).toBe("VALIDE");
  });

  it("est BIENTOT_ECHEANCE juste avant le seuil", () => {
    const dansLeSeuil = new Date(aujourdHui.getTime() + (SEUIL_BIENTOT_ECHEANCE_JOURS - 1) * 24 * 60 * 60 * 1000);
    expect(calculerStatutConsommable(dansLeSeuil, { aujourdHui })).toBe("BIENTOT_ECHEANCE");
  });

  it("est PERIME une fois la date dépassée", () => {
    const hier = new Date(aujourdHui.getTime() - 24 * 60 * 60 * 1000);
    expect(calculerStatutConsommable(hier, { aujourdHui })).toBe("PERIME");
  });
});

describe("consommableUtilisable", () => {
  it("accepte VALIDE et BIENTOT_ECHEANCE", () => {
    expect(consommableUtilisable("VALIDE")).toBe(true);
    expect(consommableUtilisable("BIENTOT_ECHEANCE")).toBe(true);
  });

  it("refuse PERIME", () => {
    expect(consommableUtilisable("PERIME")).toBe(false);
  });
});

describe("verifierConsommablesPourControle", () => {
  it("ne bloque rien sans consommable sélectionné", async () => {
    const resultat = await verifierConsommablesPourControle(undefined);
    expect(resultat.ok).toBe(true);
    expect(findManyConsommable).not.toHaveBeenCalled();
  });

  it("ne bloque pas quand tous les consommables sont valides", async () => {
    findManyConsommable.mockResolvedValue([
      { id: "c1", fabricant: "Fab", reference: "Ref1", lot: "L1", peremption: null },
      { id: "c2", fabricant: "Fab", reference: "Ref2", lot: "L2", peremption: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    ]);
    const resultat = await verifierConsommablesPourControle(["c1", "c2"]);
    expect(resultat.ok).toBe(true);
  });

  it("bloque dès qu'un consommable sélectionné est périmé", async () => {
    findManyConsommable.mockResolvedValue([
      { id: "c1", fabricant: "Fab", reference: "Ref1", lot: "L1", peremption: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    ]);
    const resultat = await verifierConsommablesPourControle(["c1"]);
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.erreur).toContain("périmé");
    }
  });
});
