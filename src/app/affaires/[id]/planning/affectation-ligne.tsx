"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Affectation = {
  id: string;
  personnelNom: string;
  jointNumero: string | null;
  dateDebut: string;
  dateFin: string;
  codes: string | null;
  statut: string;
  habilitationsExpirees: number;
};

const LIBELLE_STATUT: Record<string, string> = {
  PLANIFIEE: "planifiée",
  EN_COURS: "présent",
  TERMINEE: "terminée",
  ANNULEE: "annulée",
};

function couleurStatut(statut: string): string {
  if (statut === "EN_COURS") return "#0ca30c";
  if (statut === "ANNULEE") return "#898781";
  return "inherit";
}

// Une ligne du planning, avec les boutons pour faire avancer son statut
// (voir PATCH /api/affectations) — notamment "Marquer présent" (EN_COURS),
// qui alimente le "P" de l'organigramme.
export function AffectationLigne({ affectation: a }: { affectation: Affectation }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function changerStatut(statut: string) {
    setEnCours(true);
    await fetch("/api/affectations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, statut }),
    });
    setEnCours(false);
    router.refresh();
  }

  return (
    <li style={{ marginBottom: "0.4rem", borderBottom: "1px solid #eee", paddingBottom: "0.4rem" }}>
      <strong>{a.personnelNom}</strong>
      {a.jointNumero && ` — ${a.jointNumero}`}
      {a.codes && ` — codes : ${a.codes}`} — du {new Date(a.dateDebut).toLocaleDateString("fr-FR")} au{" "}
      {new Date(a.dateFin).toLocaleDateString("fr-FR")} —{" "}
      <span style={{ color: couleurStatut(a.statut) }}>{LIBELLE_STATUT[a.statut] ?? a.statut}</span>
      {a.habilitationsExpirees > 0 && (
        <span style={{ color: "crimson" }}> — {a.habilitationsExpirees} habilitation(s) expirée(s)</span>
      )}
      {(a.statut === "PLANIFIEE" || a.statut === "EN_COURS") && (
        <span style={{ marginLeft: "0.5rem" }}>
          {a.statut === "PLANIFIEE" && (
            <button disabled={enCours} onClick={() => changerStatut("EN_COURS")} style={{ fontSize: "0.8rem", marginRight: "0.3rem" }}>
              Marquer présent
            </button>
          )}
          <button disabled={enCours} onClick={() => changerStatut("TERMINEE")} style={{ fontSize: "0.8rem", marginRight: "0.3rem" }}>
            Terminer
          </button>
          <button disabled={enCours} onClick={() => changerStatut("ANNULEE")} style={{ fontSize: "0.8rem" }}>
            Annuler
          </button>
        </span>
      )}
    </li>
  );
}
