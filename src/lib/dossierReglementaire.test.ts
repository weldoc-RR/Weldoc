import { describe, it, expect } from "vitest";
import { pointBloque, statutActuel } from "./dossierReglementaire";

describe("pointBloque", () => {
  it("seul le statut BLOQUANT bloque", () => {
    expect(pointBloque("BLOQUANT")).toBe(true);
  });

  it("les autres statuts ne bloquent pas (choix d'interprétation documenté)", () => {
    expect(pointBloque("NON_BLOQUANT")).toBe(false);
    expect(pointBloque("SOUS_RESERVE")).toBe(false);
    expect(pointBloque("ATTENTE_DECISION")).toBe(false);
    expect(pointBloque("DEBLOCAGE_AUTORISE")).toBe(false);
  });
});

describe("statutActuel", () => {
  it("retourne null sans aucun événement", () => {
    expect(statutActuel([])).toBeNull();
  });

  it("retourne le statut du dernier événement par date, pas le dernier de la liste", () => {
    const evenements = [
      { statut: "BLOQUANT" as const, date: new Date("2026-01-01T00:00:00.000Z") },
      { statut: "DEBLOCAGE_AUTORISE" as const, date: new Date("2026-03-01T00:00:00.000Z") },
      { statut: "SOUS_RESERVE" as const, date: new Date("2026-02-01T00:00:00.000Z") },
    ];
    // Volontairement pas dans l'ordre chronologique dans le tableau : la
    // fonction doit trier par date, pas se fier à l'ordre d'entrée.
    expect(statutActuel(evenements)).toBe("DEBLOCAGE_AUTORISE");
  });
});
