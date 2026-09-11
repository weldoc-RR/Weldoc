"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Révoque une autorisation de signature (voir PATCH
// /api/autorisations-signature, réservé au niveau 3). Ne supprime jamais
// la ligne : `active` repasse à false, tracé par l'audit trail.
export function RevoquerAutorisation({ id }: { id: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function revoquer() {
    setEnCours(true);
    await fetch("/api/autorisations-signature", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEnCours(false);
    router.refresh();
  }

  return (
    <button onClick={revoquer} disabled={enCours} style={{ marginLeft: "0.4rem", fontSize: "0.75rem" }}>
      {enCours ? "..." : "Révoquer"}
    </button>
  );
}
