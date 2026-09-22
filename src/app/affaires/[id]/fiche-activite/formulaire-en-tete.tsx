"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Valeurs = {
  libelleActivite: string | null;
  tranche: string | null;
  equipementsConcernes: string[];
};

// Édite l'en-tête d'activité de la fiche de suivi (voir le cahier des
// charges, "FICHE DE SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR PHASE"),
// porté par l'affaire — PATCH /api/affaires/[id]. La liste des équipements
// se saisit une ligne par élément.
export function FormulaireEnTete({ affaireId, valeurs }: { affaireId: string; valeurs: Valeurs }) {
  const router = useRouter();
  const [libelleActivite, setLibelleActivite] = useState(valeurs.libelleActivite ?? "");
  const [tranche, setTranche] = useState(valeurs.tranche ?? "");
  const [equipementsConcernes, setEquipementsConcernes] = useState(valeurs.equipementsConcernes.join("\n"));
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function versListe(texte: string): string[] {
    return texte
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(false);
    setEnCours(true);

    const res = await fetch(`/api/affaires/${affaireId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        libelleActivite: libelleActivite || null,
        tranche: tranche || null,
        equipementsConcernes: versListe(equipementsConcernes),
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer.");
      return;
    }
    setSucces(true);
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 640 }}>
      <label>
        Libellé de l&apos;activité
        <input type="text" value={libelleActivite} onChange={(e) => setLibelleActivite(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      <label>
        Tranche
        <input type="text" value={tranche} onChange={(e) => setTranche(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      <label>
        Équipement(s) concerné(s) <span style={{ fontWeight: 400, color: "var(--couleur-texte-discret)" }}>(un par ligne)</span>
        <textarea value={equipementsConcernes} onChange={(e) => setEquipementsConcernes(e.target.value)} rows={3} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
      <div>
        <button type="submit" disabled={enCours} style={{ background: "var(--couleur-primaire)", color: "#fff", borderColor: "var(--couleur-primaire)", fontWeight: 600 }}>
          {enCours ? "Enregistrement..." : "Enregistrer l'en-tête"}
        </button>
        {succes && <span style={{ color: "var(--couleur-conforme)", marginLeft: "0.6rem", fontSize: "0.85rem" }}>✓ Enregistré</span>}
      </div>
    </form>
  );
}
