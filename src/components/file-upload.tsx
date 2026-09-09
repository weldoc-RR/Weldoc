"use client";

import { useState } from "react";

// Dépôt de fichier réutilisable (voir POST /api/upload) : un vrai
// "drive" pour Weldoc plutôt que de toujours devoir coller un lien vers
// un fichier déjà hébergé ailleurs. Une fois déposé, l'URL renvoyée est
// transmise via `onDepose` — à l'appelant de décider quoi en faire
// (remplir un champ "lien vers le document", par exemple). Le champ lien
// manuel reste toujours disponible à côté : le dépôt est une commodité
// en plus, pas une obligation.
export function FileUpload({ onDepose }: { onDepose: (url: string) => void }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nomFichier, setNomFichier] = useState<string | null>(null);

  async function deposer(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    setErreur(null);
    setEnCours(true);
    const corps = new FormData();
    corps.append("fichier", fichier);

    const res = await fetch("/api/upload", { method: "POST", body: corps });
    setEnCours(false);
    if (!res.ok) {
      const corpsErr = await res.json().catch(() => null);
      setErreur(corpsErr?.error ?? "Impossible de déposer ce fichier.");
      return;
    }
    const { url } = await res.json();
    setNomFichier(fichier.name);
    onDepose(url);
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", fontSize: "0.8rem" }}>
      <label style={{ cursor: "pointer", color: "#0086c9" }}>
        {enCours ? "Dépôt en cours..." : "📷 Prendre une photo"}
        {/* `capture` ouvre directement l'appareil photo de la tablette/du
            téléphone plutôt que la galerie ou le sélecteur de fichiers —
            uniquement pour les images, un PDF ne se "capture" pas. */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={deposer}
          disabled={enCours}
          style={{ display: "none" }}
        />
      </label>
      <label style={{ cursor: "pointer", color: "#0086c9" }}>
        {enCours ? "Dépôt en cours..." : "ou déposer un fichier (PDF, photo)"}
        <input type="file" accept="application/pdf,image/*" onChange={deposer} disabled={enCours} style={{ display: "none" }} />
      </label>
      {nomFichier && !enCours && <span style={{ color: "#0ca30c" }}>✓ {nomFichier}</span>}
      {erreur && <span style={{ color: "crimson" }}>{erreur}</span>}
    </span>
  );
}
