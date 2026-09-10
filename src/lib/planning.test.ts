import { describe, it, expect } from "vitest";
import { chevauche } from "./planning";

describe("chevauche", () => {
  it("détecte un chevauchement partiel", () => {
    const a = [new Date("2026-01-01"), new Date("2026-01-10")] as const;
    const b = [new Date("2026-01-05"), new Date("2026-01-15")] as const;
    expect(chevauche(a[0], a[1], b[0], b[1])).toBe(true);
  });

  it("détecte une période entièrement incluse dans l'autre", () => {
    const a = [new Date("2026-01-01"), new Date("2026-01-31")] as const;
    const b = [new Date("2026-01-10"), new Date("2026-01-15")] as const;
    expect(chevauche(a[0], a[1], b[0], b[1])).toBe(true);
  });

  it("ne signale rien pour deux périodes disjointes", () => {
    const a = [new Date("2026-01-01"), new Date("2026-01-10")] as const;
    const b = [new Date("2026-02-01"), new Date("2026-02-10")] as const;
    expect(chevauche(a[0], a[1], b[0], b[1])).toBe(false);
  });

  it("ne signale rien pour deux périodes qui se touchent exactement (fin = début)", () => {
    const a = [new Date("2026-01-01"), new Date("2026-01-10")] as const;
    const b = [new Date("2026-01-10"), new Date("2026-01-20")] as const;
    expect(chevauche(a[0], a[1], b[0], b[1])).toBe(false);
  });
});
