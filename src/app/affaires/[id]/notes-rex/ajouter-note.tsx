"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajout d'une note REX (voir le cahier des charges, "RETOUR
// D'EXPÉRIENCE (REX)") : ouvert à tout intervenant connecté, à tout
// moment de l'affaire — pas une décision réglementaire, juste une
// observation notée au fil de l'eau.
export function AjouterNote({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/notes-rex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affaireId, texte }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer la note.");
      return;
    }
    setTexte("");
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Ajouter une note
      </button>
    );
  }

  return (
    <form onSubmit={envoyer} style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 600 }}>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Une observation sur cette affaire (fournisseur, matière, méthode...) — servira si besoin à rédiger une future fiche REX."
        rows={3}
        required
        style={{ padding: "0.5rem", fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer la note"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} disabled={enCours}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)", fontSize: "0.85rem" }}>{erreur}</p>}
    </form>
  );
}
