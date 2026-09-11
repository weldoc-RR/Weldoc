"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BilanDosi = { edpiMsv: number | null; edpoMsv: number | null; realiseMsv: number | null; deltaMsv: number | null; alea: string | null } | null;

// Formulaire du bilan dosimétrique global de l'affaire (voir PATCH
// /api/affaires/[id]/bilan-dosimetrique). Un seul enregistrement par
// affaire, en millisieverts (mSv).
export function FormulaireBilanDosimetrique({ affaireId, valeurs }: { affaireId: string; valeurs: BilanDosi }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [edpiMsv, setEdpiMsv] = useState(valeurs?.edpiMsv?.toString() ?? "");
  const [edpoMsv, setEdpoMsv] = useState(valeurs?.edpoMsv?.toString() ?? "");
  const [realiseMsv, setRealiseMsv] = useState(valeurs?.realiseMsv?.toString() ?? "");
  const [deltaMsv, setDeltaMsv] = useState(valeurs?.deltaMsv?.toString() ?? "");
  const [alea, setAlea] = useState(valeurs?.alea ?? "");
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch(`/api/affaires/${affaireId}/bilan-dosimetrique`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        edpiMsv: edpiMsv ? Number(edpiMsv) : undefined,
        edpoMsv: edpoMsv ? Number(edpoMsv) : undefined,
        realiseMsv: realiseMsv ? Number(realiseMsv) : undefined,
        deltaMsv: deltaMsv ? Number(deltaMsv) : undefined,
        alea: alea || undefined,
      }),
    });
    setEnCours(false);
    if (res.ok) router.refresh();
  }

  if (!ouvert) {
    return (
      <button className="no-print" onClick={() => setOuvert(true)}>
        Modifier le bilan dosimétrique
      </button>
    );
  }

  return (
    <form onSubmit={enregistrer} className="no-print" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
      <label style={{ fontSize: "0.85rem" }}>
        EDPI (mSv)
        <input type="number" step="0.01" value={edpiMsv} onChange={(e) => setEdpiMsv(e.target.value)} style={{ display: "block", width: 90, padding: "0.3rem" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        EDPO (mSv)
        <input type="number" step="0.01" value={edpoMsv} onChange={(e) => setEdpoMsv(e.target.value)} style={{ display: "block", width: 90, padding: "0.3rem" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Réalisé (mSv)
        <input type="number" step="0.01" value={realiseMsv} onChange={(e) => setRealiseMsv(e.target.value)} style={{ display: "block", width: 90, padding: "0.3rem" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Delta (mSv)
        <input type="number" step="0.01" value={deltaMsv} onChange={(e) => setDeltaMsv(e.target.value)} style={{ display: "block", width: 90, padding: "0.3rem" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Aléa
        <input type="text" value={alea} onChange={(e) => setAlea(e.target.value)} style={{ display: "block", width: 140, padding: "0.3rem" }} />
      </label>
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Fermer
      </button>
    </form>
  );
}
