"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ouvre un nouveau constat de prise en charge ou de restitution (voir POST
// /api/etats-des-lieux). Un nouveau constat, même type, ne remplace jamais
// le précédent : c'est le plus récent de chaque type qui fait foi.
export function OuvrirConstat({ affaireId, type, label }: { affaireId: string; type: "PRISE_EN_CHARGE" | "RESTITUTION"; label: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [zone, setZone] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + {label}
      </button>
    );
  }

  async function ouvrir(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/etats-des-lieux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affaireId, type, zone: zone || undefined }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'ouvrir ce constat.");
      return;
    }
    setZone("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ouvrir} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 420, marginBottom: "1rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Zone concernée (optionnel)
        <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Ouverture..." : "Ouvrir le constat"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
