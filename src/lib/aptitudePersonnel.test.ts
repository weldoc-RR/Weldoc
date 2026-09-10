import { describe, it, expect, vi, beforeEach } from "vitest";

// @/lib/prisma ouvre une vraie connexion Neon dès son import (voir ce
// fichier) : on le simule entièrement pour tester la logique de décision
// de src/lib/aptitudePersonnel.ts sans toucher à la base de données.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    qualification: { findMany: vi.fn() },
    acuiteVisuelle: { findMany: vi.fn() },
    personnel: { findUnique: vi.fn() },
    affectation: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  verifierQualificationBloquante,
  verifierAcuiteVisuelleBloquante,
  verifierAffectationBloquante,
} from "./aptitudePersonnel";

const findManyQualification = prisma.qualification.findMany as unknown as ReturnType<typeof vi.fn>;
const findManyAcuite = prisma.acuiteVisuelle.findMany as unknown as ReturnType<typeof vi.fn>;
const findUniquePersonnel = prisma.personnel.findUnique as unknown as ReturnType<typeof vi.fn>;
const findManyAffectation = prisma.affectation.findMany as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findManyQualification.mockReset();
  findManyAcuite.mockReset();
  findUniquePersonnel.mockReset();
  findManyAffectation.mockReset();
});

describe("verifierQualificationBloquante", () => {
  it("ne bloque jamais une personne sans aucune qualification enregistrée (additif)", async () => {
    findManyQualification.mockResolvedValue([]);
    const resultat = await verifierQualificationBloquante("p1", "SOUDAGE");
    expect(resultat.bloque).toBe(false);
  });

  it("bloque quand la seule qualification enregistrée est expirée", async () => {
    findManyQualification.mockResolvedValue([
      { statut: "VALIDE", dateExpiration: new Date("2000-01-01") },
    ]);
    const resultat = await verifierQualificationBloquante("p1", "SOUDAGE");
    expect(resultat.bloque).toBe(true);
    expect(resultat.motif).toMatch(/soudage/);
  });

  it("bloque quand la seule qualification enregistrée est suspendue, même non expirée", async () => {
    findManyQualification.mockResolvedValue([
      { statut: "SUSPENDU", dateExpiration: new Date("2099-01-01") },
    ]);
    const resultat = await verifierQualificationBloquante("p1", "CND");
    expect(resultat.bloque).toBe(true);
    expect(resultat.motif).toMatch(/CND/);
  });

  it("ne bloque pas dès qu'au moins une qualification reste valide, même si une autre est expirée", async () => {
    findManyQualification.mockResolvedValue([
      { statut: "VALIDE", dateExpiration: new Date("2000-01-01") },
      { statut: "VALIDE", dateExpiration: new Date("2099-01-01") },
    ]);
    const resultat = await verifierQualificationBloquante("p1", "SOUDAGE");
    expect(resultat.bloque).toBe(false);
  });

  it("ne bloque pas une qualification sans échéance (valide indéfiniment)", async () => {
    findManyQualification.mockResolvedValue([{ statut: "VALIDE", dateExpiration: null }]);
    const resultat = await verifierQualificationBloquante("p1", "CND");
    expect(resultat.bloque).toBe(false);
  });
});

describe("verifierAcuiteVisuelleBloquante", () => {
  it("ne bloque jamais une personne sans aucun test enregistré (additif)", async () => {
    findManyAcuite.mockResolvedValue([]);
    const resultat = await verifierAcuiteVisuelleBloquante("p1");
    expect(resultat.bloque).toBe(false);
  });

  it("bloque quand le dernier test enregistré est \"non apte\"", async () => {
    findManyAcuite.mockResolvedValue([{ apte: false, dateExpiration: new Date("2099-01-01") }]);
    const resultat = await verifierAcuiteVisuelleBloquante("p1");
    expect(resultat.bloque).toBe(true);
  });

  it("bloque quand le dernier test enregistré est expiré, même s'il était apte", async () => {
    findManyAcuite.mockResolvedValue([{ apte: true, dateExpiration: new Date("2000-01-01") }]);
    const resultat = await verifierAcuiteVisuelleBloquante("p1");
    expect(resultat.bloque).toBe(true);
  });

  it("ne bloque pas quand le dernier test est apte et non expiré", async () => {
    findManyAcuite.mockResolvedValue([{ apte: true, dateExpiration: new Date("2099-01-01") }]);
    const resultat = await verifierAcuiteVisuelleBloquante("p1");
    expect(resultat.bloque).toBe(false);
  });
});

describe("verifierAffectationBloquante", () => {
  it("ne bloque jamais un niveau 3, même sans affectation", async () => {
    findUniquePersonnel.mockResolvedValue({ niveau: "NIVEAU_3" });
    findManyAffectation.mockResolvedValue([{ personnelId: "autre" }]);
    const resultat = await verifierAffectationBloquante("p1", "aff1");
    expect(resultat.bloque).toBe(false);
    expect(findManyAffectation).not.toHaveBeenCalled();
  });

  it("ne bloque jamais quand l'affaire n'a aucune affectation enregistrée (additif)", async () => {
    findUniquePersonnel.mockResolvedValue({ niveau: "NIVEAU_1" });
    findManyAffectation.mockResolvedValue([]);
    const resultat = await verifierAffectationBloquante("p1", "aff1");
    expect(resultat.bloque).toBe(false);
  });

  it("bloque une personne niveau 1/2 non affectée quand l'affaire a des affectations pour d'autres personnes", async () => {
    findUniquePersonnel.mockResolvedValue({ niveau: "NIVEAU_2" });
    findManyAffectation.mockResolvedValue([{ personnelId: "autre1" }, { personnelId: "autre2" }]);
    const resultat = await verifierAffectationBloquante("p1", "aff1");
    expect(resultat.bloque).toBe(true);
    expect(resultat.motif).toMatch(/affectée/);
  });

  it("ne bloque pas une personne qui figure bien parmi les affectations de l'affaire", async () => {
    findUniquePersonnel.mockResolvedValue({ niveau: "NIVEAU_1" });
    findManyAffectation.mockResolvedValue([{ personnelId: "autre1" }, { personnelId: "p1" }]);
    const resultat = await verifierAffectationBloquante("p1", "aff1");
    expect(resultat.bloque).toBe(false);
  });

  it("exclut les affectations annulées de la requête (statut != ANNULEE)", async () => {
    findUniquePersonnel.mockResolvedValue({ niveau: "NIVEAU_1" });
    findManyAffectation.mockResolvedValue([]);
    await verifierAffectationBloquante("p1", "aff1");
    expect(findManyAffectation).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ statut: { not: "ANNULEE" } }) })
    );
  });
});
