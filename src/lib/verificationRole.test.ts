import { describe, it, expect } from "vitest";
import { correspondFonction, FONCTION_SOUDEUR } from "./verificationRole";

describe("correspondFonction", () => {
  it("reconnaît une correspondance exacte", () => {
    expect(correspondFonction(["Soudeur"], FONCTION_SOUDEUR)).toBe(true);
  });

  it("ignore la casse et les espaces superflus", () => {
    expect(correspondFonction(["  soudeur "], FONCTION_SOUDEUR)).toBe(true);
    expect(correspondFonction(["SOUDEUR"], FONCTION_SOUDEUR)).toBe(true);
  });

  it("reconnaît une fonction parmi plusieurs", () => {
    expect(correspondFonction(["Chargé de travaux", "Soudeur"], FONCTION_SOUDEUR)).toBe(true);
  });

  it("ne trouve pas de correspondance sans fonction du tout", () => {
    expect(correspondFonction([], FONCTION_SOUDEUR)).toBe(false);
  });

  it("ne trouve pas de correspondance avec des fonctions différentes", () => {
    expect(correspondFonction(["Contrôleur CND", "Chargé d'affaires"], FONCTION_SOUDEUR)).toBe(false);
  });

  it("ne devine pas les synonymes non prévus", () => {
    expect(correspondFonction(["Opérateur soudage"], FONCTION_SOUDEUR)).toBe(false);
  });
});
