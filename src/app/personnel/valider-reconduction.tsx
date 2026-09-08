"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ValiderReconduction({ qualificationId }: { qualificationId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nouvelleDateExpiration, setNouvelleDateExpiration] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem" }}>
        Valider la reconduction
      </button>
    );
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/qualifications/${qualificationId}/evenements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "RECONDUCTION_VALIDEE",
        nouvelleDateExpiration: new Date(nouvelleDateExpiration).toISOString(),
        commentaire: commentaire || undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de valider (réservé au niveau 3, une date est requise).");
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={valider}
      style={{ display: "block", marginTop: "0.3rem" }}
    >
      <p style={{ fontSize: "0.8rem", color: "#898781", margin: "0 0 0.3rem 0" }}>
        Rappel : selon la plupart des référentiels, une reconduction par l&apos;activité ne remplace pas
        indéfiniment la qualification initiale — vérifiez qu&apos;un nouvel essai de qualification n&apos;est pas
        dû (périodicité propre à votre référentiel, ex. tous les 3 ans).
      </p>
      <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
      <label style={{ fontSize: "0.85rem" }}>
        Nouvelle échéance{" "}
        <input
          required
          type="date"
          value={nouvelleDateExpiration}
          onChange={(e) => setNouvelleDateExpiration(e.target.value)}
        />
      </label>
      <input
        type="text"
        placeholder="Commentaire (optionnel)"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        style={{ fontSize: "0.85rem" }}
      />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Confirmer"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "crimson", fontSize: "0.85rem" }}>{erreur}</span>}
      </div>
    </form>
  );
}
