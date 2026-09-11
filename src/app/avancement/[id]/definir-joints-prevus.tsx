"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Saisit ou corrige le nombre de joints prévus sur l'affaire (voir PATCH
// /api/affaires/[id]) — ex. d'après le plan d'isométrie. Permet
// l'avancement "38 joints soudés sur 120 prévus" (voir
// src/lib/avancement.ts) en plus de l'avancement par phase.
export function DefinirJointsPrevus({ affaireId, valeurActuelle }: { affaireId: string; valeurActuelle: number | null }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState(valeurActuelle !== null ? String(valeurActuelle) : "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
        {valeurActuelle !== null ? "Corriger" : "Saisir le nombre de joints prévus"}
      </button>
    );
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/affaires/${affaireId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreJointsPrevus: valeur === "" ? null : Number(valeur) }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer.");
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.5rem" }}>
      <input
        type="number"
        min={0}
        step={1}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder="ex. 120"
        style={{ width: "5rem", fontSize: "0.85rem" }}
      />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
    </form>
  );
}
