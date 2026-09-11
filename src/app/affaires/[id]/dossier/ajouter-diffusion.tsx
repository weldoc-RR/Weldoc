"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajoute un destinataire à la liste de diffusion du RFI (voir POST
// /api/diffusions-rfi) — noms/organismes en texte libre.
export function AjouterDiffusion({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [organisme, setOrganisme] = useState("");
  const [portee, setPortee] = useState<"INTERNE" | "EXTERNE">("INTERNE");
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch("/api/diffusions-rfi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affaireId, nom, organisme: organisme || undefined, portee }),
    });
    setEnCours(false);
    if (res.ok) {
      setNom("");
      setOrganisme("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={ajouter} className="no-print" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
      <select value={portee} onChange={(e) => setPortee(e.target.value as "INTERNE" | "EXTERNE")} style={{ padding: "0.3rem" }}>
        <option value="INTERNE">Interne</option>
        <option value="EXTERNE">Externe</option>
      </select>
      <input required type="text" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} style={{ padding: "0.3rem" }} />
      <input type="text" placeholder="Organisme (optionnel)" value={organisme} onChange={(e) => setOrganisme(e.target.value)} style={{ padding: "0.3rem" }} />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Ajouter"}
      </button>
    </form>
  );
}
