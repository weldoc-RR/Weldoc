"use client";

import type { PasseWpsFormulaire } from "./passe-wps";

const champTexte = { display: "block", width: "100%", padding: "0.3rem", fontSize: "0.85rem" } as const;

function Champ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={{ fontSize: "0.8rem" }}>
      {label}
      <input type={type} step={type === "number" ? "0.1" : undefined} value={value} onChange={(e) => onChange(e.target.value)} style={champTexte} />
    </label>
  );
}

export function EditeurPasse({
  passe,
  onChange,
  onSupprimer,
}: {
  passe: PasseWpsFormulaire;
  onChange: (p: PasseWpsFormulaire) => void;
  onSupprimer: () => void;
}) {
  function maj<K extends keyof PasseWpsFormulaire>(champ: K, valeur: string) {
    onChange({ ...passe, [champ]: valeur });
  }

  return (
    <div style={{ border: "1px solid var(--couleur-bordure)", padding: "0.6rem", marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <strong style={{ fontSize: "0.85rem" }}>Passe n° {passe.ordre}</strong>
        <button type="button" onClick={onSupprimer} style={{ fontSize: "0.8rem" }}>
          Retirer cette passe
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
        <Champ label="Procédé (ex. 141)" value={passe.procede} onChange={(v) => maj("procede", v)} />
        <Champ label="Mode (M/S/A)" value={passe.modeOperatoire} onChange={(v) => maj("modeOperatoire", v)} />
        <Champ label="Position (ex. H-L045)" value={passe.position} onChange={(v) => maj("position", v)} />
        <Champ label="Métal d'apport (F/EE)" value={passe.metalApportType} onChange={(v) => maj("metalApportType", v)} />
        <Champ
          label="Désignation normalisée"
          value={passe.metalApportDesignationNormalisee}
          onChange={(v) => maj("metalApportDesignationNormalisee", v)}
        />
        <Champ
          label="Désignation commerciale"
          value={passe.metalApportDesignationCommerciale}
          onChange={(v) => maj("metalApportDesignationCommerciale", v)}
        />
        <Champ label="Diamètre métal d'apport (mm)" type="number" value={passe.metalApportDiametreMm} onChange={(v) => maj("metalApportDiametreMm", v)} />
        <Champ label="Gaz endroit — nature" value={passe.gazEndroitNature} onChange={(v) => maj("gazEndroitNature", v)} />
        <Champ label="Gaz endroit — débit (L/mn)" value={passe.gazEndroitDebit} onChange={(v) => maj("gazEndroitDebit", v)} />
        <Champ label="Gaz envers — nature" value={passe.gazEnversNature} onChange={(v) => maj("gazEnversNature", v)} />
        <Champ label="Gaz envers — débit (L/mn)" value={passe.gazEnversDebit} onChange={(v) => maj("gazEnversDebit", v)} />
        <Champ label="Courant et polarité" value={passe.natureCourantPolarite} onChange={(v) => maj("natureCourantPolarite", v)} />
        <Champ label="Intensité min (A)" type="number" value={passe.intensiteAMin} onChange={(v) => maj("intensiteAMin", v)} />
        <Champ label="Intensité max (A)" type="number" value={passe.intensiteAMax} onChange={(v) => maj("intensiteAMax", v)} />
        <Champ label="Tension min (V)" type="number" value={passe.tensionVMin} onChange={(v) => maj("tensionVMin", v)} />
        <Champ label="Tension max (V)" type="number" value={passe.tensionVMax} onChange={(v) => maj("tensionVMax", v)} />
        <Champ label="Temp. mini pièce (°C)" type="number" value={passe.temperatureMiniPieceC} onChange={(v) => maj("temperatureMiniPieceC", v)} />
        <Champ
          label="Temp. maxi entre passes (°C)"
          type="number"
          value={passe.temperatureMaxiEntrePassesC}
          onChange={(v) => maj("temperatureMaxiEntrePassesC", v)}
        />
      </div>
      <label style={{ fontSize: "0.8rem", display: "block", marginTop: "0.4rem" }}>
        Observations (optionnel)
        <input type="text" value={passe.observations} onChange={(e) => maj("observations", e.target.value)} style={champTexte} />
      </label>
    </div>
  );
}
