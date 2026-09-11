"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ajoute un relevé de portique de contrôle radiologique (voir POST
// /api/portiques-radioprotection) — catégorie en texte libre (ex. C1, C2,
// C3, propre au modèle réel).
export function AjouterPortique({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [categorie, setCategorie] = useState("");
  const [nombre, setNombre] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [observations, setObservations] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    const res = await fetch("/api/portiques-radioprotection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        categorie,
        nombre: Number(nombre),
        localisation: localisation || undefined,
        observations: observations || undefined,
      }),
    });
    setEnCours(false);
    if (res.ok) {
      setCategorie("");
      setNombre("");
      setLocalisation("");
      setObservations("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={ajouter} className="no-print" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.4rem" }}>
      <input required type="text" placeholder="Catégorie (ex. C1)" value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ width: 100, padding: "0.3rem" }} />
      <input required type="number" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: 80, padding: "0.3rem" }} />
      <input type="text" placeholder="Localisation (optionnel)" value={localisation} onChange={(e) => setLocalisation(e.target.value)} style={{ padding: "0.3rem", width: 160 }} />
      <input type="text" placeholder="Observations (optionnel)" value={observations} onChange={(e) => setObservations(e.target.value)} style={{ padding: "0.3rem", flex: 1, minWidth: 160 }} />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Ajouter"}
      </button>
    </form>
  );
}
