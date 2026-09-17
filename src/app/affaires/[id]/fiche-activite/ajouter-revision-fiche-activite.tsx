"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajoute une évolution à l'historique des indices de la fiche de suivi
// d'activité (voir POST /api/revisions-fiche-activite) : un nouvel
// enregistrement, jamais une modification de l'indice précédent.
export function AjouterRevisionFicheActivite({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [indice, setIndice] = useState("");
  const [natureEvolution, setNatureEvolution] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch("/api/revisions-fiche-activite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affaireId, indice, natureEvolution }),
    });
    setEnCours(false);
    if (res.ok) {
      setIndice("");
      setNatureEvolution("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
      <input
        required
        type="text"
        placeholder="Indice (ex. A, B...)"
        value={indice}
        onChange={(e) => setIndice(e.target.value)}
        style={{ width: 110, padding: "0.3rem" }}
      />
      <input
        required
        type="text"
        placeholder="Nature de l'évolution"
        value={natureEvolution}
        onChange={(e) => setNatureEvolution(e.target.value)}
        style={{ padding: "0.3rem", flex: 1, minWidth: 220 }}
      />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Ajouter"}
      </button>
    </form>
  );
}
