"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SIGLES = ["DIM", "VT", "PT", "MT", "RT", "UT"] as const;
const LIBELLES: Record<(typeof SIGLES)[number], string> = {
  DIM: "Dimensionnel",
  VT: "Visuel",
  PT: "Ressuage",
  MT: "Magnétoscopie",
  RT: "Radiographie",
  UT: "Ultrasons",
};

// Déclare une seule fois quels contrôles sont exigés sur chaque joint
// d'origine de cette affaire (voir src/lib/controlesManquants.ts et
// l'alerte "contrôles manquants" sur /alertes) — jamais bloquant,
// seulement une alerte tant qu'un joint n'a pas le contrôle exigé.
export function ControlesRequis({ affaireId, valeurActuelle }: { affaireId: string; valeurActuelle: string[] }) {
  const router = useRouter();
  const [coches, setCoches] = useState<Set<string>>(new Set(valeurActuelle));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(nouvelleListe: Set<string>) {
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/affaires/${affaireId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controlesRequis: [...nouvelleListe] }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer.");
      return;
    }
    router.refresh();
  }

  function basculer(sigle: string) {
    const suivant = new Set(coches);
    if (suivant.has(sigle)) suivant.delete(sigle);
    else suivant.add(sigle);
    setCoches(suivant);
    enregistrer(suivant);
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem" }}>Contrôles requis sur chaque joint</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-discret)", margin: "0 0 0.4rem 0" }}>
        Coché une fois pour l&apos;affaire : un joint d&apos;origine sans ce contrôle apparaît en alerte
        &laquo;&nbsp;contrôles manquants&nbsp;&raquo; (page /alertes), sans jamais bloquer la fabrication.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
        {SIGLES.map((sigle) => (
          <label key={sigle} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <input type="checkbox" checked={coches.has(sigle)} disabled={enCours} onChange={() => basculer(sigle)} />
            {sigle} — {LIBELLES[sigle]}
          </label>
        ))}
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</p>}
    </div>
  );
}
