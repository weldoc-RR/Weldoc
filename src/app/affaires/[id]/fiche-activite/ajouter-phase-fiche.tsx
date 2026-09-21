"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajoute une phase à une séquence directement depuis le document (voir
// POST /api/phases) : réservé au préparateur, avant validation de la
// fiche — voir la page fiche-activite.
export function AjouterPhaseFiche({ sequenceId, prochainOrdre }: { sequenceId: string; prochainOrdre: number }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceId, nom, ordre: prochainOrdre }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'ajouter la phase.");
      return;
    }
    setNom("");
    router.refresh();
  }

  return (
    <tr className="no-print">
      <td colSpan={6} style={{ padding: "0.3rem 0.4rem" }}>
        <form onSubmit={ajouter} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Ajouter une opération à cette étape…"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            style={{ fontSize: "0.8rem", padding: "0.2rem", flex: 1, maxWidth: 320 }}
          />
          <button type="submit" disabled={enCours || !nom.trim()} style={{ fontSize: "0.8rem" }}>
            {enCours ? "..." : "Ajouter"}
          </button>
          {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.75rem" }}>{erreur}</span>}
        </form>
      </td>
    </tr>
  );
}
