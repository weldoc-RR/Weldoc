"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Affaire = { id: string; numero: string };

const NORMES_RECONNUES = ["EN 10216-2 (T nominale)", "EN 10216-2 (Tmin)", "EN 10216-2 (fini à froid)"];

// Déclare ce qui est commandé/prévu pour l'affaire (voir POST
// /api/matieres-prevues), saisi une seule fois par l'encadrement puis
// comparé automatiquement à chaque matière réceptionnée sur cette
// affaire (voir src/lib/conformiteMatiere.ts) — jamais de blocage,
// seulement une alerte si ça ne correspond pas.
export function DeclarerMatierePrevue({ affaires }: { affaires: Affaire[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [affaireId, setAffaireId] = useState("");
  const [designation, setDesignation] = useState("");
  const [normeProduit, setNormeProduit] = useState("");
  const [nuance, setNuance] = useState("");
  const [diametre, setDiametre] = useState("");
  const [epaisseur, setEpaisseur] = useState("");
  const [quantitePrevue, setQuantitePrevue] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Déclarer une matière prévue pour une affaire
      </button>
    );
  }

  async function declarer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/matieres-prevues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        designation,
        normeProduit,
        nuance,
        diametre: diametre ? Number(diametre) : undefined,
        epaisseur: epaisseur ? Number(epaisseur) : undefined,
        quantitePrevue: quantitePrevue || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette matière prévue.");
      return;
    }
    setOuvert(false);
    setDesignation("");
    setNormeProduit("");
    setNuance("");
    setDiametre("");
    setEpaisseur("");
    setQuantitePrevue("");
    router.refresh();
  }

  return (
    <form onSubmit={declarer} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Affaire
        <select required value={affaireId} onChange={(e) => setAffaireId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="">— choisir —</option>
          {affaires.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero}
            </option>
          ))}
        </select>
      </label>
      <label>
        Désignation (ex. Tube acier carbone)
        <input required type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Norme produit
        <input
          required
          list="normes-reconnues-prevue"
          type="text"
          value={normeProduit}
          onChange={(e) => setNormeProduit(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        />
        <datalist id="normes-reconnues-prevue">
          {NORMES_RECONNUES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <label>
        Nuance
        <input required type="text" value={nuance} onChange={(e) => setNuance(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Diamètre nominal (mm, optionnel)
          <input type="number" step="0.1" value={diametre} onChange={(e) => setDiametre(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Épaisseur nominale (mm, optionnel)
          <input type="number" step="0.1" value={epaisseur} onChange={(e) => setEpaisseur(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <label>
        Quantité prévue (optionnel, texte libre — ex. "12 tubes de 6 m")
        <input type="text" value={quantitePrevue} onChange={(e) => setQuantitePrevue(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
