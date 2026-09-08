"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublierCharte() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [version, setVersion] = useState("");
  const [contenu, setContenu] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Publier une nouvelle version de la charte
      </button>
    );
  }

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/chartes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, contenu }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de publier (réservé au niveau 3, version déjà utilisée ?).");
      return;
    }
    setVersion("");
    setContenu("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={publier} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 600, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#52514e" }}>
        Une nouvelle version ne remplace jamais la précédente : c&apos;est un nouvel enregistrement, et tout le
        monde devra la réaccepter avant de pouvoir de nouveau signer un document.
      </p>
      <label>
        Version (ex. "2026-1")
        <input required type="text" value={version} onChange={(e) => setVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Contenu
        <textarea required rows={8} value={contenu} onChange={(e) => setContenu(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Publication..." : "Publier"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
