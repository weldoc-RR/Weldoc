"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Referentiel = { id: string; code: string; domaine: string };

// Enregistre un produit de la bibliothèque dimensionnelle (ou une
// nouvelle révision : même référence, version différente) — voir POST
// /api/produits-dimensionnels. Les critères min/maxi doivent venir de la
// norme réelle (jamais recalculés par Weldoc, voir l'avertissement dans
// src/lib/tolerances.ts).
export function AjouterProduitDimensionnel({ referentiels }: { referentiels: Referentiel[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [reference, setReference] = useState("");
  const [version, setVersion] = useState("Rev 0");
  const [designation, setDesignation] = useState("");
  const [type, setType] = useState("");
  const [normeProduit, setNormeProduit] = useState("");
  const [diametreNominalMm, setDiametreNominalMm] = useState("");
  const [epaisseurNominaleMm, setEpaisseurNominaleMm] = useState("");
  const [finition, setFinition] = useState("");
  const [etat, setEtat] = useState("");
  const [classeType, setClasseType] = useState("");
  const [diametreMiniMm, setDiametreMiniMm] = useState("");
  const [diametreMaxiMm, setDiametreMaxiMm] = useState("");
  const [epaisseurMiniMm, setEpaisseurMiniMm] = useState("");
  const [epaisseurMaxiMm, setEpaisseurMaxiMm] = useState("");
  const [referentielId, setReferentielId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Ajouter un produit
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/produits-dimensionnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        version,
        designation,
        type: type || undefined,
        normeProduit,
        diametreNominalMm: diametreNominalMm ? Number(diametreNominalMm) : undefined,
        epaisseurNominaleMm: epaisseurNominaleMm ? Number(epaisseurNominaleMm) : undefined,
        finition: finition || undefined,
        etat: etat || undefined,
        classeType: classeType || undefined,
        diametreMiniMm: Number(diametreMiniMm),
        diametreMaxiMm: Number(diametreMaxiMm),
        epaisseurMiniMm: Number(epaisseurMiniMm),
        epaisseurMaxiMm: Number(epaisseurMaxiMm),
        referentielId: referentielId || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de créer ce produit.");
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid var(--couleur-bordure)", padding: "1rem" }}>
      <label>
        Référence (ex. TUBE-DN100-SCH40)
        <input required type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Version
        <input required type="text" value={version} onChange={(e) => setVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Désignation
        <input required type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Type (ex. tube, tôle, raccord, bride, pièce...)
        <input type="text" value={type} onChange={(e) => setType(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Norme produit (ex. EN 10216-1)
        <input required type="text" value={normeProduit} onChange={(e) => setNormeProduit(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Diamètre nominal (mm, optionnel)
          <input type="number" step="0.1" value={diametreNominalMm} onChange={(e) => setDiametreNominalMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Épaisseur nominale (mm, optionnel)
          <input type="number" step="0.1" value={epaisseurNominaleMm} onChange={(e) => setEpaisseurNominaleMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Finition (optionnel)
          <input type="text" value={finition} onChange={(e) => setFinition(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          État (optionnel)
          <input type="text" value={etat} onChange={(e) => setEtat(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Classe/type (optionnel)
          <input type="text" value={classeType} onChange={(e) => setClasseType(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--couleur-texte-discret)", margin: "0.2rem 0 0 0" }}>
        Critères min/maxi (à reprendre depuis la norme réelle, jamais calculés par Weldoc) :
      </p>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Diamètre mini (mm)
          <input required type="number" step="0.01" value={diametreMiniMm} onChange={(e) => setDiametreMiniMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Diamètre maxi (mm)
          <input required type="number" step="0.01" value={diametreMaxiMm} onChange={(e) => setDiametreMaxiMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Épaisseur mini (mm)
          <input required type="number" step="0.01" value={epaisseurMiniMm} onChange={(e) => setEpaisseurMiniMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Épaisseur maxi (mm)
          <input required type="number" step="0.01" value={epaisseurMaxiMm} onChange={(e) => setEpaisseurMaxiMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      {referentiels.length > 0 && (
        <label>
          Référentiel (optionnel)
          <select value={referentielId} onChange={(e) => setReferentielId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
            <option value="">— aucun —</option>
            {referentiels.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} ({r.domaine})
              </option>
            ))}
          </select>
        </label>
      )}
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Création..." : "Créer le produit"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
    </form>
  );
}
