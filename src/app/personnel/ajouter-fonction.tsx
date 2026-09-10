"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FONCTIONS_SUGGEREES } from "@/lib/verificationRole";

// Ajoute une fonction à une personne (voir POST /api/personnel/[id]/fonctions,
// réservé au niveau 2, tracé par l'audit trail) — jusqu'ici cette route
// n'avait aucune interface, seulement l'API. Le datalist propose les
// fonctions du cahier des charges, mais le champ reste du texte libre
// ("autres configurables").
export function AjouterFonction({ personnelId, fonctionsActuelles }: { personnelId: string; fonctionsActuelles: string[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [fonction, setFonction] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter() {
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/personnel/${personnelId}/fonctions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fonction }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'ajouter cette fonction.");
      return;
    }
    setOuvert(false);
    setFonction("");
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
        + Ajouter une fonction
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.5rem" }}>
      <input
        required
        list={`fonctions-suggerees-${personnelId}`}
        type="text"
        placeholder="Fonction (ex. Soudeur)"
        value={fonction}
        onChange={(e) => setFonction(e.target.value)}
        style={{ fontSize: "0.85rem", width: 180 }}
      />
      <datalist id={`fonctions-suggerees-${personnelId}`}>
        {FONCTIONS_SUGGEREES.filter((f) => !fonctionsActuelles.includes(f)).map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <button onClick={ajouter} disabled={enCours || !fonction.trim()}>
        {enCours ? "..." : "Ajouter"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
    </span>
  );
}
