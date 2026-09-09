"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DefinirPin({ personnelId }: { personnelId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
        Définir le code PIN
      </button>
    );
  }

  async function definir(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/personnel/${personnelId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer ce PIN (6 à 12 chiffres, droits requis).");
      return;
    }
    setPin("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={definir} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.5rem" }}>
      <input
        required
        type="password"
        inputMode="numeric"
        placeholder="Nouveau PIN (6-12 chiffres)"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ fontSize: "0.85rem", width: 160 }}
      />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "crimson", fontSize: "0.8rem" }}>{erreur}</span>}
    </form>
  );
}
