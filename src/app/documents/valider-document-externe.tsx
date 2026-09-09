"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Validation d'un document externe par une personne habilitée (niveau 3,
// voir POST /api/documents-externes/[id]/validation). Une fois faite,
// jamais modifiée : un document corrigé se réimporte comme une nouvelle
// révision plutôt que d'écraser cette validation.
export function ValiderDocumentExterne({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [conclusion, setConclusion] = useState<"CONFORME" | "NON_CONFORME">("CONFORME");
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch(`/api/documents-externes/${documentId}/validation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conclusion, commentaire: commentaire || undefined }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette validation.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={valider} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: 420, marginTop: "0.5rem" }}>
      <label>
        Conclusion
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
          {enCours ? "Enregistrement..." : "Enregistrer la validation"}
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
