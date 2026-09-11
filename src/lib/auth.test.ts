import { describe, it, expect, vi, beforeEach } from "vitest";

// @/lib/prisma ouvre une vraie connexion Neon dès son import (voir ce
// fichier) : on le simule pour tester la logique de verrouillage sans
// toucher à la base de données, même principe que aptitudePersonnel.test.ts.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    compte: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { compteVerrouille, enregistrerEchecConnexion, reinitialiserEchecsConnexion, SEUIL_TENTATIVES_ECHOUEES } from "./auth";

const findUniqueCompte = prisma.compte.findUnique as unknown as ReturnType<typeof vi.fn>;
const updateCompte = prisma.compte.update as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findUniqueCompte.mockReset();
  updateCompte.mockReset();
});

describe("compteVerrouille", () => {
  it("n'est pas verrouillé sans date de verrouillage", () => {
    expect(compteVerrouille({ verrouilleJusqua: null })).toBe(false);
  });

  it("est verrouillé si la date de verrouillage est future", () => {
    expect(compteVerrouille({ verrouilleJusqua: new Date(Date.now() + 60_000) })).toBe(true);
  });

  it("n'est plus verrouillé une fois la date passée", () => {
    expect(compteVerrouille({ verrouilleJusqua: new Date(Date.now() - 60_000) })).toBe(false);
  });
});

describe("enregistrerEchecConnexion", () => {
  it("incrémente le compteur sans verrouiller avant le seuil", async () => {
    findUniqueCompte.mockResolvedValue({ id: "c1", tentativesEchouees: 1 });
    await enregistrerEchecConnexion("c1");
    expect(updateCompte).toHaveBeenCalledWith({ where: { id: "c1" }, data: { tentativesEchouees: 2 } });
  });

  it("verrouille et remet le compteur à zéro une fois le seuil atteint", async () => {
    findUniqueCompte.mockResolvedValue({ id: "c1", tentativesEchouees: SEUIL_TENTATIVES_ECHOUEES - 1 });
    await enregistrerEchecConnexion("c1");
    const appel = updateCompte.mock.calls[0][0];
    expect(appel.where).toEqual({ id: "c1" });
    expect(appel.data.tentativesEchouees).toBe(0);
    expect(appel.data.verrouilleJusqua).toBeInstanceOf(Date);
    expect(appel.data.verrouilleJusqua.getTime()).toBeGreaterThan(Date.now());
  });

  it("ne fait rien si le compte est introuvable", async () => {
    findUniqueCompte.mockResolvedValue(null);
    await enregistrerEchecConnexion("inconnu");
    expect(updateCompte).not.toHaveBeenCalled();
  });
});

describe("reinitialiserEchecsConnexion", () => {
  it("remet le compteur et le verrouillage à zéro", async () => {
    await reinitialiserEchecsConnexion("c1");
    expect(updateCompte).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { tentativesEchouees: 0, verrouilleJusqua: null },
    });
  });
});
