"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajoute un événement au résumé chronologique de l'intervention (voir POST
// /api/chronologie).
export function AjouterEvenementChronologie({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch("/api/chronologie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affaireId, date: new Date(date).toISOString(), description }),
    });
    setEnCours(false);
    if (res.ok) {
      setDate("");
      setDescription("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={ajouter} className="no-print" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
      <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: "0.3rem" }} />
      <input required type="text" placeholder="Description de l'événement" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: "0.3rem", flex: 1, minWidth: 200 }} />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Ajouter"}
      </button>
    </form>
  );
}
