"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Referentiel = { id: string; code: string; domaine: string; version: string | null };

// Référentiels applicables à cette affaire (voir AffaireReferentiel dans
// schema.prisma et GET/POST/DELETE /api/affaires/[id]/referentiels) —
// jusqu'ici ce lien n'avait aucune interface. Le référentiel lui-même se
// crée une seule fois sur /referentiels, ici on ne fait que le lier ou le
// délier de l'affaire, jamais le recréer.
export function ReferentielsAffaire({
  affaireId,
  tous,
  lies,
}: {
  affaireId: string;
  tous: Referentiel[];
  lies: Referentiel[];
}) {
  const router = useRouter();
  const disponibles = tous.filter((r) => !lies.some((l) => l.id === r.id));
  const [referentielId, setReferentielId] = useState(disponibles[0]?.id ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function lier(e: React.FormEvent) {
    e.preventDefault();
    if (!referentielId) return;
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/affaires/${affaireId}/referentiels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referentielId }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de lier ce référentiel.");
      return;
    }
    router.refresh();
  }

  async function delier(id: string) {
    await fetch(`/api/affaires/${affaireId}/referentiels?referentielId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem" }}>Référentiels applicables</h2>
      {lies.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-discret)" }}>Aucun référentiel lié à cette affaire pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {lies.map((r) => (
            <li key={r.id} style={{ border: "1px solid var(--couleur-bordure)", borderRadius: 4, padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}>
              {r.code} {r.version && `(${r.version})`}
              <button type="button" onClick={() => delier(r.id)} style={{ marginLeft: "0.4rem", fontSize: "0.75rem" }}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {disponibles.length > 0 ? (
        <form onSubmit={lier} style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.4rem" }}>
          <select value={referentielId} onChange={(e) => setReferentielId(e.target.value)} style={{ padding: "0.3rem", fontSize: "0.85rem" }}>
            {disponibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.domaine}
                {r.version ? ` (${r.version})` : ""}
              </option>
            ))}
          </select>
          <button type="submit" disabled={enCours} style={{ fontSize: "0.85rem" }}>
            {enCours ? "..." : "Lier"}
          </button>
          {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
        </form>
      ) : (
        tous.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-discret)" }}>
            Aucun référentiel enregistré — <a href="/referentiels">en créer un</a>.
          </p>
        )
      )}
    </div>
  );
}
