import { describe, it, expect, vi, beforeEach } from "vitest";

// @/lib/prisma ouvre une vraie connexion Neon dès son import (voir ce
// fichier) : on le simule entièrement pour tester la logique de décision
// de src/lib/aptitudePersonnel.ts sans toucher à la base de données.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    qualification: { findMany: vi.fn() },
    acuiteVisuelle: { findMany: vi.fn() },
    affectation: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { verifierQualificationBloquante, verifierAcuiteVisuelleBloquante, assurerAffectation } from "./aptitudePersonnel";

const findManyQualification = prisma.qualification.findMany as unknown as ReturnType<typeof vi.fn>;
const findManyAcuite = prisma.acuiteVisuelle.findMany as unknown as ReturnType<typeof vi.fn>;
const findFirstAffectation = prisma.affectation.findFirst as unknown as ReturnType<typeof vi.fn>;
const createAffectation = prisma.affectation.create as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findManyQualification.mockReset();
  findManyAcuite.mockReset();
  findFirstAffectation.mockReset();
  createAffectation.mockReset();
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

describe("assurerAffectation", () => {
  it("ne crée rien quand la personne a déjà une affectation (autre qu'annulée) sur l'affaire", async () => {
    findFirstAffectation.mockResolvedValue({ id: "existante" });
    await assurerAffectation("p1", "aff1", "Soudeur", "createur1");
    expect(createAffectation).not.toHaveBeenCalled();
  });

  it("crée une affectation marquée comme déjà réalisée quand la personne n'en a aucune sur l'affaire", async () => {
    findFirstAffectation.mockResolvedValue(null);
    await assurerAffectation("p1", "aff1", "Soudeur", "createur1");
    expect(createAffectation).toHaveBeenCalledTimes(1);
    const data = createAffectation.mock.calls[0][0].data;
    expect(data).toMatchObject({
      personnelId: "p1",
      affaireId: "aff1",
      fonction: "Soudeur",
      statut: "TERMINEE",
      creeParId: "createur1",
    });
    expect(data.dateDebut).toEqual(data.dateFin);
  });

  it("recherche uniquement les affectations non annulées de cette personne sur cette affaire", async () => {
    findFirstAffectation.mockResolvedValue(null);
    await assurerAffectation("p1", "aff1", "Contrôleur CND", "createur1");
    expect(findFirstAffectation).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { personnelId: "p1", affaireId: "aff1", statut: { not: "ANNULEE" } },
      })
    );
  });
});
