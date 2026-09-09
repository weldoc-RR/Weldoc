"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajoute une évolution à l'historique des révisions du RFI (voir POST
// /api/revisions-rfi) : un nouvel enregistrement, jamais une modification
// de la révision précédente.
export function AjouterRevision({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [indice, setIndice] = useState("");
  const [natureEvolutions, setNatureEvolutions] = useState("");
  const [redacteurs, setRedacteurs] = useState("");
  const [verificateurs, setVerificateurs] = useState("");
  const [approbateurs, setApprobateurs] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch("/api/revisions-rfi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        indice,
        natureEvolutions,
        redacteurs: redacteurs || undefined,
        verificateurs: verificateurs || undefined,
        approbateurs: approbateurs || undefined,
      }),
    });
    setEnCours(false);
    if (res.ok) {
      setIndice("");
      setNatureEvolutions("");
      setRedacteurs("");
      setVerificateurs("");
      setApprobateurs("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={ajouter} className="no-print" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
      <input required type="text" placeholder="Indice (ex. 0, A...)" value={indice} onChange={(e) => setIndice(e.target.value)} style={{ width: 90, padding: "0.3rem" }} />
      <input required type="text" placeholder="Nature des évolutions" value={natureEvolutions} onChange={(e) => setNatureEvolutions(e.target.value)} style={{ padding: "0.3rem", flex: 1, minWidth: 160 }} />
      <input type="text" placeholder="Rédacteur(s)" value={redacteurs} onChange={(e) => setRedacteurs(e.target.value)} style={{ padding: "0.3rem", width: 130 }} />
      <input type="text" placeholder="Vérificateur(s)" value={verificateurs} onChange={(e) => setVerificateurs(e.target.value)} style={{ padding: "0.3rem", width: 130 }} />
      <input type="text" placeholder="Approbateur(s)" value={approbateurs} onChange={(e) => setApprobateurs(e.target.value)} style={{ padding: "0.3rem", width: 130 }} />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Ajouter"}
      </button>
    </form>
  );
}
