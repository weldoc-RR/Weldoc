"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Revue d'un document externe par une personne habilitée (niveau 3, voir
// POST /api/pv-externes/[id]/revue). Une fois faite, cette revue n'est
// jamais modifiée : un document corrigé se réimporte comme un nouveau PV
// externe plutôt que d'écraser cette revue.
export function RevuePvExterne({ pvExterneId }: { pvExterneId: string }) {
  const router = useRouter();
  const [conclusion, setConclusion] = useState<"CONFORME" | "NON_CONFORME">("CONFORME");
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function reviser(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch(`/api/pv-externes/${pvExterneId}/revue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conclusion, commentaire: commentaire || undefined }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette revue.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={reviser} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: 420, marginTop: "0.5rem" }}>
      <label>
        Conclusion de la revue
        <select value={conclusion} onChange={(e) => setConclusion(e.target.value as "CONFORME" | "NON_CONFORME")} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="CONFORME">Conforme</option>
          <option value="NON_CONFORME">Non conforme</option>
        </select>
      </label>
      <label>
        Commentaire (optionnel)
        <input type="text" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer la revue"}
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
    </form>
  );
}
