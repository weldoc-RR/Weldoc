"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccepterCharte({ charteId }: { charteId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function accepter() {
    setEnCours(true);
    const res = await fetch(`/api/chartes/${charteId}/acceptation`, { method: "POST" });
    setEnCours(false);
    if (res.ok) router.refresh();
  }

  return (
    <button onClick={accepter} disabled={enCours}>
      {enCours ? "..." : "J'accepte cette version de la charte"}
    </button>
  );
}
