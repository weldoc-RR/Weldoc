"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Suspend ou réactive une habilitation (voir PATCH /api/habilitations/[id],
// réservé au niveau 3, tracé par l'audit trail) — même principe que
// suspendre un compte (basculer-compte.tsx), avec en plus un motif
// obligatoire pour suspendre (jamais pour réactiver). Une habilitation
// suspendue bloque comme une habilitation expirée (voir
// src/lib/aptitudePersonnel.ts).
export function SuspendreHabilitation({ habilitationId, suspendue }: { habilitationId: string; suspendue: boolean }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(statut: "VALIDE" | "SUSPENDU", motifEnvoye?: string) {
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/habilitations/${habilitationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut, motif: motifEnvoye }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de changer le statut de cette habilitation.");
      return;
    }
    setOuvert(false);
    setMotif("");
    router.refresh();
  }

  if (suspendue) {
    return (
      <span style={{ marginLeft: "0.5rem" }}>
        <button onClick={() => envoyer("VALIDE")} disabled={enCours} style={{ fontSize: "0.8rem" }}>
          {enCours ? "..." : "Réactiver"}
        </button>
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem", marginLeft: "0.3rem" }}>{erreur}</span>}
      </span>
    );
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
        Suspendre
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.5rem" }}>
      <input
        required
        type="text"
        placeholder="Motif de suspension"
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        style={{ fontSize: "0.85rem", width: 180 }}
      />
      <button onClick={() => envoyer("SUSPENDU", motif)} disabled={enCours || !motif}>
        {enCours ? "..." : "Confirmer"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
    </span>
  );
}
