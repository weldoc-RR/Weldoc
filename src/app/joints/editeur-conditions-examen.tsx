"use client";

import type { ConditionsExamenFormulaire } from "./conditions-examen";

const champ = { display: "block", width: "100%", padding: "0.3rem", fontSize: "0.85rem" } as const;

function Champ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ fontSize: "0.8rem" }}>
      {label}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={champ} />
    </label>
  );
}

// Section repliée par défaut (tout facultatif) : numéro de PV, critères
// d'acceptation et conditions d'examen d'un procès-verbal — voir
// ConditionsExamenSchema dans src/lib/controles.ts.
export function EditeurConditionsExamen({
  valeurs,
  onChange,
}: {
  valeurs: ConditionsExamenFormulaire;
  onChange: (v: ConditionsExamenFormulaire) => void;
}) {
  function maj<K extends keyof ConditionsExamenFormulaire>(champ: K, v: string) {
    onChange({ ...valeurs, [champ]: v });
  }

  return (
    <details style={{ marginTop: "0.4rem" }}>
      <summary style={{ fontSize: "0.85rem", cursor: "pointer" }}>
        N° de PV, critères d&apos;acceptation et conditions d&apos;examen (optionnel)
      </summary>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.4rem" }}>
        <Champ label="N° de PV" value={valeurs.numeroPV} onChange={(v) => maj("numeroPV", v)} />
        <Champ label="Référentiel d'acceptation" value={valeurs.referentielAcceptation} onChange={(v) => maj("referentielAcceptation", v)} />
        <Champ label="Édition du référentiel" value={valeurs.editionReferentiel} onChange={(v) => maj("editionReferentiel", v)} />
        <Champ label="Catégorie de construction" value={valeurs.categorieConstruction} onChange={(v) => maj("categorieConstruction", v)} />
        <Champ label="Niveau d'examen" value={valeurs.niveauExamen} onChange={(v) => maj("niveauExamen", v)} />
        <Champ label="Méthode d'examen" value={valeurs.methodeExamen} onChange={(v) => maj("methodeExamen", v)} />
        <Champ label="Surfaces examinées" value={valeurs.surfacesExaminees} onChange={(v) => maj("surfacesExaminees", v)} />
        <Champ label="État de la surface" value={valeurs.etatSurface} onChange={(v) => maj("etatSurface", v)} />
        <Champ label="Éclairage" value={valeurs.eclairage} onChange={(v) => maj("eclairage", v)} />
        <Champ label="Moyens utilisés" value={valeurs.moyensUtilises} onChange={(v) => maj("moyensUtilises", v)} />
      </div>
    </details>
  );
}
