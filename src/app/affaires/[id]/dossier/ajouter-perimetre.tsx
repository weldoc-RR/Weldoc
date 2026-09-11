"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajoute une ligne "qui a la charge de quoi" (voir POST
// /api/perimetres-travaux) — texte libre, ex. "EDF-ULM-AMT-O" /
// "Maître d'œuvre désigné par l'Exploitant a la charge de...".
export function AjouterPerimetre({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [intervenant, setIntervenant] = useState("");
  const [description, setDescription] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch("/api/perimetres-travaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affaireId, intervenant, description }),
    });
    setEnCours(false);
    if (res.ok) {
      setIntervenant("");
      setDescription("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={ajouter} className="no-print" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
      <input required type="text" placeholder="Intervenant (ex. EDF-ULM-AMT-O)" value={intervenant} onChange={(e) => setIntervenant(e.target.value)} style={{ padding: "0.3rem", width: 200 }} />
      <input required type="text" placeholder="Description du périmètre" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: "0.3rem", flex: 1, minWidth: 200 }} />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Ajouter"}
      </button>
    </form>
  );
}
