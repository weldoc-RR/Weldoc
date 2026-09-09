"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";

type Affaire = { id: string; numero: string; client: string };

const LIBELLE_STATUT: Record<string, string> = {
  PRISE_EN_CHARGE: "prise en charge",
  EN_FABRICATION: "en fabrication",
  TERMINEE: "terminée",
  EXPEDIEE: "expédiée",
};

export function AjouterPiece({ affaires }: { affaires: Affaire[] }) {
  const router = useRouter();
  const [affaireId, setAffaireId] = useState(affaires[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [designation, setDesignation] = useState("");
  const [photosUrls, setPhotosUrls] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/pieces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        reference,
        designation: designation || undefined,
        photosUrls: photosUrls
          .split(/[\n,]/)
          .map((u) => u.trim())
          .filter(Boolean),
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette pièce (référence déjà utilisée sur cette affaire ?).");
      return;
    }
    setReference("");
    setDesignation("");
    setPhotosUrls("");
    router.refresh();
  }

  if (affaires.length === 0) {
    return <p>Créez d&apos;abord une affaire avant de pouvoir prendre en charge une pièce.</p>;
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480 }}>
      <label>
        Affaire
        <select value={affaireId} onChange={(e) => setAffaireId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          {affaires.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero} — {a.client}
            </option>
          ))}
        </select>
      </label>
      <label>
        Référence de la pièce
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        />
      </label>
      <label>
        Désignation (optionnel)
        <input
          type="text"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        />
      </label>
      <label>
        Photos des repères présents sur la pièce (une URL par ligne, optionnel)
        <textarea
          value={photosUrls}
          onChange={(e) => setPhotosUrls(e.target.value)}
          rows={3}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        />
      </label>
      <FileUpload onDepose={(url) => setPhotosUrls((precedent) => (precedent ? `${precedent}\n${url}` : url))} />
      <button type="submit" disabled={enCours}>
        {enCours ? "Enregistrement..." : "Prendre en charge"}
      </button>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}

export { LIBELLE_STATUT };
