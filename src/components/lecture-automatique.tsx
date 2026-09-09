"use client";

import { useState } from "react";

export interface ChampsLus {
  reference: string | null;
  intitule: string | null;
  norme: string | null;
  dateObtention: string | null;
  dateExpiration: string | null;
  organisme: string | null;
}

// Lecture automatique d'un document déjà déposé (voir POST
// /api/lecture-document) : propose de pré-remplir le formulaire à partir
// du document, jamais de l'enregistrer directement — la personne relit et
// corrige avant de valider, exactement comme pour une saisie manuelle.
// N'apparaît qu'une fois un document effectivement déposé ou lié.
export function LectureAutomatique({
  documentUrl,
  type,
  onLu,
}: {
  documentUrl: string;
  type: "QUALIFICATION" | "HABILITATION";
  onLu: (champs: ChampsLus) => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lu, setLu] = useState(false);

  if (!documentUrl) return null;

  async function lire() {
    setErreur(null);
    setEnCours(true);
    setLu(false);
    const res = await fetch("/api/lecture-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentUrl, type }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Lecture automatique impossible.");
      return;
    }
    onLu(await res.json());
    setLu(true);
  }

  return (
    <div style={{ fontSize: "0.8rem" }}>
      <button type="button" onClick={lire} disabled={enCours} style={{ color: "#0086c9" }}>
        {enCours ? "Lecture en cours..." : "Lire automatiquement le document"}
      </button>
      {lu && (
        <span style={{ color: "#0ca30c", marginLeft: "0.4rem" }}>
          ✓ Champs proposés ci-dessus — à vérifier avant d&apos;enregistrer
        </span>
      )}
      {erreur && <span style={{ color: "crimson", marginLeft: "0.4rem" }}>{erreur}</span>}
    </div>
  );
}
