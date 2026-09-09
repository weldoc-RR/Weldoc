"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

// Importe un document externe (ou une nouvelle révision : même référence,
// version différente) — voir POST /api/documents-externes. Un même
// document peut se relier à plusieurs affaires/joints/phases/FNC/
// personnel/équipements à la fois : pas besoin de le réimporter pour
// chaque usage (voir le cahier des charges).
export function AjouterDocumentExterne({
  affaires,
  joints,
  phases,
  fncs,
  personnel,
  outils,
}: {
  affaires: Option[];
  joints: Option[];
  phases: Option[];
  fncs: Option[];
  personnel: Option[];
  outils: Option[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [reference, setReference] = useState("");
  const [version, setVersion] = useState("Rev 0");
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("");
  const [url, setUrl] = useState("");
  const [dateDocument, setDateDocument] = useState("");
  const [affaireIds, setAffaireIds] = useState<string[]>([]);
  const [jointIds, setJointIds] = useState<string[]>([]);
  const [phaseIds, setPhaseIds] = useState<string[]>([]);
  const [fncIds, setFncIds] = useState<string[]>([]);
  const [personnelIds, setPersonnelIds] = useState<string[]>([]);
  const [outilIds, setOutilIds] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function selection(e: React.ChangeEvent<HTMLSelectElement>): string[] {
    return Array.from(e.target.selectedOptions).map((o) => o.value);
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Importer un document
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/documents-externes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        version,
        titre,
        categorie: categorie || undefined,
        url,
        dateDocument: dateDocument ? new Date(dateDocument).toISOString() : undefined,
        affaireIds,
        jointIds,
        phaseIds,
        fncIds,
        personnelIds,
        outilIds,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'importer ce document.");
      return;
    }
    setReference("");
    setVersion("Rev 0");
    setTitre("");
    setCategorie("");
    setUrl("");
    setDateDocument("");
    setAffaireIds([]);
    setJointIds([]);
    setPhaseIds([]);
    setFncIds([]);
    setPersonnelIds([]);
    setOutilIds([]);
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 520, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Référence (ex. DOC-FOURN-001)
        <input required type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Version
        <input required type="text" value={version} onChange={(e) => setVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Titre
        <input required type="text" value={titre} onChange={(e) => setTitre(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Catégorie (ex. fournisseur, sous-traitant CND, traitement thermique, organisme externe...)
        <input type="text" value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le document
        <input required type="text" value={url} onChange={(e) => setUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date du document (optionnel)
        <input type="date" value={dateDocument} onChange={(e) => setDateDocument(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>

      <p style={{ fontSize: "0.8rem", color: "#898781", margin: "0.4rem 0 0 0" }}>
        Éléments concernés (optionnel, plusieurs possibles — Ctrl/Cmd + clic) :
      </p>
      {([
        ["Affaires", affaires, affaireIds, setAffaireIds],
        ["Joints", joints, jointIds, setJointIds],
        ["Phases", phases, phaseIds, setPhaseIds],
        ["FNC", fncs, fncIds, setFncIds],
        ["Personnel", personnel, personnelIds, setPersonnelIds],
        ["Équipements", outils, outilIds, setOutilIds],
      ] as const).map(([label, options, , setter]) =>
        options.length > 0 ? (
          <label key={label} style={{ fontSize: "0.85rem" }}>
            {label}
            <select multiple size={Math.min(4, options.length)} onChange={(e) => setter(selection(e))} style={{ display: "block", width: "100%", padding: "0.3rem" }}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null
      )}

      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Importer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
