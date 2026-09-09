"use client";

import { useRouter } from "next/navigation";

export function RetirerProcedure({
  endpoint,
  id,
  retiree,
}: {
  endpoint: "/api/wps" | "/api/qmos" | "/api/procedures-internes";
  id: string;
  retiree: boolean;
}) {
  const router = useRouter();

  async function basculer() {
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, retiree: !retiree }),
    });
    router.refresh();
  }

  return (
    <button onClick={basculer} style={{ marginLeft: "0.5rem" }}>
      {retiree ? "Réactiver" : "Retirer"}
    </button>
  );
}
