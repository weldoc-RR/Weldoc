"use client";

import { useRouter } from "next/navigation";

export function ConfirmerValidite({ qualificationId }: { qualificationId: string }) {
  const router = useRouter();

  async function confirmer() {
    const res = await fetch(`/api/qualifications/${qualificationId}/evenements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CONFIRMATION_VALIDITE" }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <button onClick={confirmer} style={{ marginLeft: "0.5rem" }}>
      Confirmer la validité
    </button>
  );
}
