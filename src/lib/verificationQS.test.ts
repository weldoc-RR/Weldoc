import { describe, it, expect } from "vitest";
import { verifierQS, type QualificationPourVerificationQS, type WpsPourVerificationQS } from "./verificationQS";

function qualification(overrides: Partial<QualificationPourVerificationQS> = {}): QualificationPourVerificationQS {
  return {
    id: "q1",
    procede: null,
    groupeMateriaux: null,
    epaisseurMinMm: null,
    epaisseurMaxMm: null,
    diametreMinMm: null,
    diametreMaxMm: null,
    ...overrides,
  };
}

function wps(overrides: Partial<WpsPourVerificationQS> = {}): WpsPourVerificationQS {
  return {
    procede: "141",
    groupeMateriaux: null,
    epaisseurMinMm: null,
    epaisseurMaxMm: null,
    diametreMinMm: null,
    diametreMaxMm: null,
    ...overrides,
  };
}

describe("verifierQS", () => {
  it("AUCUNE_QUALIFICATION quand le soudeur n'a aucune qualification", () => {
    const resultat = verifierQS([], wps());
    expect(resultat.statut).toBe("AUCUNE_QUALIFICATION");
  });

  it("DONNEES_INSUFFISANTES quand rien n'est comparable des deux côtés", () => {
    const resultat = verifierQS([qualification({ id: "q1" })], wps({ procede: "141", groupeMateriaux: null }));
    // qualification sans aucun champ renseigné, WPS avec seulement le procédé
    // -> le procédé du WPS ne peut être comparé qu'à un procédé qualifié
    // renseigné, qui manque ici.
    expect(resultat.statut).toBe("DONNEES_INSUFFISANTES");
  });

  it("COUVERT quand le procédé, le groupe de matériaux et les plages correspondent", () => {
    const q = qualification({
      id: "q-couvrante",
      procede: "141",
      groupeMateriaux: "8.1",
      epaisseurMinMm: 2,
      epaisseurMaxMm: 20,
      diametreMinMm: 10,
      diametreMaxMm: 200,
    });
    const w = wps({ procede: "141", groupeMateriaux: "8.1", epaisseurMinMm: 5, epaisseurMaxMm: 10, diametreMinMm: 50, diametreMaxMm: 100 });

    const resultat = verifierQS([q], w);
    expect(resultat.statut).toBe("COUVERT");
    expect(resultat.qualificationCouvranteId).toBe("q-couvrante");
    expect(resultat.ecarts).toEqual([]);
  });

  it("la comparaison ignore la casse et les espaces (ex. \"141\" vs \" 141 \")", () => {
    const q = qualification({ procede: " 141 " });
    const w = wps({ procede: "141" });
    const resultat = verifierQS([q], w);
    expect(resultat.statut).toBe("COUVERT");
  });

  it("NON_COUVERT quand le procédé qualifié diffère du procédé du WPS", () => {
    const q = qualification({ procede: "111" });
    const w = wps({ procede: "141" });
    const resultat = verifierQS([q], w);
    expect(resultat.statut).toBe("NON_COUVERT");
    expect(resultat.ecarts.length).toBeGreaterThan(0);
  });

  it("NON_COUVERT quand l'épaisseur du WPS dépasse le domaine qualifié", () => {
    const q = qualification({ epaisseurMinMm: 2, epaisseurMaxMm: 8 });
    const w = wps({ epaisseurMinMm: 5, epaisseurMaxMm: 10 });
    const resultat = verifierQS([q], w);
    expect(resultat.statut).toBe("NON_COUVERT");
  });

  it("un champ vide d'un côté n'est ni un écart ni une preuve de couverture pour ce champ", () => {
    // Épaisseur non renseignée sur le WPS : ne doit pas compter comme un
    // écart, même si la qualification a une plage définie.
    const q = qualification({ procede: "141", epaisseurMinMm: 2, epaisseurMaxMm: 8 });
    const w = wps({ procede: "141", epaisseurMinMm: null, epaisseurMaxMm: null });
    const resultat = verifierQS([q], w);
    expect(resultat.statut).toBe("COUVERT");
  });

  it("retient la qualification la moins éloignée (le moins d'écarts) quand aucune ne couvre entièrement", () => {
    const proche = qualification({ id: "proche", procede: "141", groupeMateriaux: "9.1" });
    const eloignee = qualification({ id: "eloignee", procede: "111", groupeMateriaux: "9.1" });
    const w = wps({ procede: "141", groupeMateriaux: "8.1" });

    const resultat = verifierQS([eloignee, proche], w);
    expect(resultat.statut).toBe("NON_COUVERT");
    // "proche" n'a qu'un écart (groupe de matériaux), "eloignee" en a deux
    // (procédé + groupe) : c'est "proche" qui doit être retenue comme
    // meilleure candidate, quel que soit l'ordre d'entrée.
    expect(resultat.ecarts.some((e) => e.includes("groupe"))).toBe(true);
    expect(resultat.ecarts.some((e) => e.includes("procédé"))).toBe(false);
  });
});
