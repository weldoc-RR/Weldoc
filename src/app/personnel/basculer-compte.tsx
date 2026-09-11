"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Suspend ou réactive le compte de connexion d'une personne (voir PATCH
// /api/auth/comptes/[id], réservé au niveau 3, tracé par l'audit trail).
// Une fois suspendu, l'accès est perdu immédiatement (sessions
// révocables, voir src/lib/auth.ts).
export function BasculerCompte({ compteId, statut }: { compteId: string; statut: "ACTIF" | "SUSPENDU" }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function basculer() {
    setErreur(null);
    setEnCours(true);
    const nouveauStatut = statut === "ACTIF" ? "SUSPENDU" : "ACTIF";
    const res = await fetch(`/api/auth/comptes/${compteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveauStatut }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de changer le statut du compte.");
      return;
    }
    router.refresh();
  }

  return (
    <span style={{ marginLeft: "0.5rem" }}>
      <button onClick={basculer} disabled={enCours} style={{ fontSize: "0.8rem" }}>
        {enCours ? "..." : statut === "ACTIF" ? "Suspendre le compte" : "Réactiver le compte"}
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem", marginLeft: "0.3rem" }}>{erreur}</span>}
    </span>
  );
}
