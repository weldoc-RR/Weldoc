"use client";

import { useRouter } from "next/navigation";

const ETAPES = ["PRISE_EN_CHARGE", "EN_FABRICATION", "TERMINEE", "EXPEDIEE"] as const;

export function ChangerStatut({ pieceId, statutActuel }: { pieceId: string; statutActuel: string }) {
  const router = useRouter();
  const index = ETAPES.indexOf(statutActuel as (typeof ETAPES)[number]);
  const suivante = ETAPES[index + 1];

  if (!suivante) return null;

  async function avancer() {
    await fetch("/api/pieces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pieceId, statut: suivante }),
    });
    router.refresh();
  }

  return (
    <button onClick={avancer} style={{ marginLeft: "0.5rem" }}>
      → {suivante === "EN_FABRICATION" ? "en fabrication" : suivante === "TERMINEE" ? "terminée" : "expédiée"}
    </button>
  );
}
