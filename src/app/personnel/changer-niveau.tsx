"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Change le niveau de décision d'une personne (voir PATCH
// /api/personnel/[id], réservé au niveau 3, tracé par l'audit trail).
export function ChangerNiveau({ personnelId, niveauActuel }: { personnelId: string; niveauActuel: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [niveau, setNiveau] = useState(niveauActuel);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
        Changer le niveau
      </button>
    );
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/personnel/${personnelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niveau }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de changer le niveau.");
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.5rem" }}>
      <select value={niveau} onChange={(e) => setNiveau(e.target.value)} style={{ fontSize: "0.85rem" }}>
        <option value="NIVEAU_1">NIVEAU_1</option>
        <option value="NIVEAU_2">NIVEAU_2</option>
        <option value="NIVEAU_3">NIVEAU_3</option>
      </select>
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "crimson", fontSize: "0.8rem" }}>{erreur}</span>}
    </form>
  );
}
