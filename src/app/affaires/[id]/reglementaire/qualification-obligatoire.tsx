"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Exige, sur cette affaire, qu'une personne ait au moins une qualification
// (soudage ou CND) au dossier avant de souder un joint ou de réaliser un
// contrôle CND — pas seulement qu'aucune ne soit expirée (voir
// src/lib/aptitudePersonnel.ts, verifierQualificationBloquante). Décoché
// par défaut = comportement additif habituel, comme les autres cases à
// cocher de cette page (contrôles/documents requis).
export function QualificationObligatoire({ affaireId, valeurActuelle }: { affaireId: string; valeurActuelle: boolean }) {
  const router = useRouter();
  const [coche, setCoche] = useState(valeurActuelle);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function basculer() {
    const nouvelleValeur = !coche;
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/affaires/${affaireId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qualificationSurDossierObligatoire: nouvelleValeur }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer.");
      return;
    }
    setCoche(nouvelleValeur);
    router.refresh();
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem" }}>Qualification au dossier obligatoire</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-discret)", margin: "0 0 0.4rem 0" }}>
        Coché : une personne sans aucune qualification (soudage ou CND) enregistrée est bloquée dès qu&apos;elle
        tente de souder un joint ou de réaliser un contrôle CND sur cette affaire — pas seulement une personne dont
        la qualification a expiré, déjà bloquée par ailleurs.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
        <input type="checkbox" checked={coche} disabled={enCours} onChange={basculer} />
        Exiger une qualification au dossier sur cette affaire
      </label>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</p>}
    </div>
  );
}
