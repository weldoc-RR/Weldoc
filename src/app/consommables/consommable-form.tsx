"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { valeur: "PENETRANT", libelle: "Pénétrant (ressuage)" },
  { valeur: "REVELATEUR", libelle: "Révélateur (ressuage)" },
  { valeur: "NETTOYANT", libelle: "Nettoyant (ressuage/magnétoscopie)" },
  { valeur: "POUDRE_MAGNETIQUE", libelle: "Poudre magnétique (magnétoscopie)" },
  { valeur: "PRODUIT_CONTRASTE", libelle: "Produit de contraste (magnétoscopie)" },
  { valeur: "DEMAGNETISANT", libelle: "Démagnétisant (magnétoscopie)" },
  { valeur: "FILM_RADIOGRAPHIQUE", libelle: "Film radiographique (radiographie)" },
  { valeur: "PRODUIT_DEVELOPPEMENT", libelle: "Produit de développement (radiographie)" },
  { valeur: "COUPLANT", libelle: "Couplant (ultrasons)" },
  { valeur: "AUTRE", libelle: "Autre" },
] as const;

// Ajoute un produit/lot à la bibliothèque des consommables CND (voir
// POST /api/consommables-cnd). Si le même produit/lot existe déjà,
// l'API renvoie l'enregistrement existant plutôt que d'en créer un
// doublon.
export function ConsommableForm() {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["valeur"]>("PENETRANT");
  const [fabricant, setFabricant] = useState("");
  const [reference, setReference] = useState("");
  const [lot, setLot] = useState("");
  const [peremption, setPeremption] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/consommables-cnd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        fabricant,
        reference,
        lot,
        peremption: peremption ? new Date(peremption).toISOString() : undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'ajouter ce consommable.");
      return;
    }
    setFabricant("");
    setReference("");
    setLot("");
    setPeremption("");
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem" }}>
      <select value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number]["valeur"])} style={{ padding: "0.4rem" }}>
        {TYPES.map((t) => (
          <option key={t.valeur} value={t.valeur}>
            {t.libelle}
          </option>
        ))}
      </select>
      <input type="text" value={fabricant} onChange={(e) => setFabricant(e.target.value)} placeholder="Fabricant" required style={{ padding: "0.4rem" }} />
      <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Référence" required style={{ padding: "0.4rem" }} />
      <input type="text" value={lot} onChange={(e) => setLot(e.target.value)} placeholder="Lot" required style={{ padding: "0.4rem" }} />
      <label style={{ fontSize: "0.85rem" }}>
        Péremption (optionnel)
        <input type="date" value={peremption} onChange={(e) => setPeremption(e.target.value)} style={{ display: "block", padding: "0.4rem" }} />
      </label>
      <button type="submit" disabled={enCours}>
        {enCours ? "Ajout..." : "Ajouter"}
      </button>
      {erreur && <span style={{ color: "crimson", fontSize: "0.85rem" }}>{erreur}</span>}
    </form>
  );
}
