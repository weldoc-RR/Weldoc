"use client";

import { indicationVide, type IndicationFormulaire } from "./indications";

// Une seule indication non conforme suffit à rendre le contrôle entier non
// conforme (voir calculerResultat dans src/lib/controles.ts) : le rappel
// ci-dessous est là pour que ce ne soit pas une surprise au moment de
// décocher "conforme" sur une ligne.
export function EditeurIndications({
  indications,
  onChange,
}: {
  indications: IndicationFormulaire[];
  onChange: (indications: IndicationFormulaire[]) => void;
}) {
  function ajouter() {
    onChange([...indications, indicationVide()]);
  }
  function majIndication(index: number, indication: IndicationFormulaire) {
    onChange(indications.map((ind, i) => (i === index ? indication : ind)));
  }
  function supprimer(index: number) {
    onChange(indications.filter((_, i) => i !== index));
  }

  return (
    <div>
      <p style={{ fontSize: "0.9rem", margin: "0.5rem 0" }}>
        Indications ({indications.length}) — une seule non conforme rend le contrôle entier non conforme.
      </p>
      {indications.map((ind, i) => (
        <div key={i} style={{ border: "1px solid var(--couleur-bordure)", borderRadius: 6, padding: "0.75rem", marginBottom: "0.6rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label style={{ fontSize: "0.9rem" }}>
              Localisation
              <input
                required
                type="text"
                value={ind.localisation}
                onChange={(e) => majIndication(i, { ...ind, localisation: e.target.value })}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "0.9rem" }}>
              Nature
              <input
                required
                type="text"
                value={ind.nature}
                onChange={(e) => majIndication(i, { ...ind, nature: e.target.value })}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "0.9rem" }}>
              Dimensions (optionnel)
              <input
                type="text"
                value={ind.dimensions}
                onChange={(e) => majIndication(i, { ...ind, dimensions: e.target.value })}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "0.9rem" }}>
              Critère applicable (optionnel)
              <input
                type="text"
                value={ind.critereApplicable}
                onChange={(e) => majIndication(i, { ...ind, critereApplicable: e.target.value })}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "0.9rem" }}>
              Commentaire (optionnel)
              <input
                type="text"
                value={ind.commentaire}
                onChange={(e) => majIndication(i, { ...ind, commentaire: e.target.value })}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "0.9rem" }}>
              Photo (URL, optionnel)
              <input
                type="text"
                value={ind.photoUrl}
                onChange={(e) => majIndication(i, { ...ind, photoUrl: e.target.value })}
                style={{ display: "block", width: "100%" }}
              />
            </label>
          </div>
          <label style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              checked={ind.conforme}
              onChange={(e) => majIndication(i, { ...ind, conforme: e.target.checked })}
            />
            Conforme
          </label>
          <button type="button" onClick={() => supprimer(i)} style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            Retirer cette indication
          </button>
        </div>
      ))}
      <button type="button" onClick={ajouter}>
        + Ajouter une indication
      </button>
    </div>
  );
}
