"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Codes de référentiel courants suggérés (jamais imposés) — voir le
// même principe de datalist que "norme produit" ailleurs dans
// l'application (src/app/joints/ajouter-matiere.tsx).
const CODES_SUGGERES = ["EN 13480", "ASME B31.3", "EN ISO 9606-1", "EN ISO 15614-1", "EN ISO 9712", "RCC-M"];
const DOMAINES_SUGGERES = ["Soudage", "CND", "Dimensionnel", "Construction/tuyauterie", "Contrôle"];

// Enregistre un référentiel (code de norme), niveau 2 minimum (voir POST
// /api/referentiels). Une fois enregistré, le référentiel se choisit
// ensuite dans les listes déroulantes concernées (qualification, produit
// dimensionnel, affaire) — il ne se ressaisit jamais.
export function AjouterReferentiel() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [domaine, setDomaine] = useState("");
  const [version, setVersion] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/referentiels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, domaine, version: version || undefined }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer ce référentiel.");
      return;
    }
    setCode("");
    setDomaine("");
    setVersion("");
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem" }}>
      <input
        type="text"
        list="codes-referentiels-suggeres"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code (ex. EN 13480)"
        required
        style={{ padding: "0.4rem" }}
      />
      <datalist id="codes-referentiels-suggeres">
        {CODES_SUGGERES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <input
        type="text"
        list="domaines-referentiels-suggeres"
        value={domaine}
        onChange={(e) => setDomaine(e.target.value)}
        placeholder="Domaine (ex. Soudage)"
        required
        style={{ padding: "0.4rem" }}
      />
      <datalist id="domaines-referentiels-suggeres">
        {DOMAINES_SUGGERES.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <input
        type="text"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
        placeholder="Édition/version (optionnel, ex. 2023)"
        style={{ padding: "0.4rem" }}
      />
      <button type="submit" disabled={enCours}>
        {enCours ? "Ajout..." : "Ajouter"}
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.85rem" }}>{erreur}</span>}
    </form>
  );
}
