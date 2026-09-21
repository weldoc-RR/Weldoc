"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Retire une phase directement depuis le document (voir DELETE
// /api/phases) : réservé, comme l'ajout, au préparateur avant validation
// — l'API refuse de toute façon la suppression d'une phase déjà utilisée
// (signée, documentée...) ou d'une fiche déjà validée.
export function SupprimerPhaseFiche({ phaseId, nom }: { phaseId: string; nom: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function supprimer() {
    if (!confirm(`Supprimer la phase "${nom}" ?`)) return;
    setEnCours(true);
    setErreur(null);
    const res = await fetch("/api/phases", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: phaseId }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de supprimer.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="no-print" style={{ display: "inline-block", marginLeft: "0.3rem" }}>
      <button
        type="button"
        onClick={supprimer}
        disabled={enCours}
        title="Supprimer cette phase"
        style={{ fontSize: "0.7rem", color: "var(--couleur-non-conforme)", background: "none", border: "1px solid var(--couleur-non-conforme)", borderRadius: 4, padding: "0 0.3rem", cursor: "pointer" }}
      >
        ×
      </button>
      {erreur && <div style={{ color: "var(--couleur-non-conforme)", fontSize: "0.7rem" }}>{erreur}</div>}
    </span>
  );
}
