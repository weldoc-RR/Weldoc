"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Procedure = { id: string; reference: string; version: string; titre: string };
type InfoSignature = { nom: string; prenom: string; dateSignature: string };

const LIBELLE_STATUT: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  NON_APPLICABLE: "Non applicable",
};

// Fait avancer une phase et/ou change la procédure interne applicable en
// un seul PATCH /api/phases (voir le cahier des charges, "DOCUMENTATION ET
// PROCÉDURES INTERNES" : "la version réellement utilisée à l'exécution
// est conservée dans l'historique" — ce lien vers une révision précise de
// la bibliothèque suffit, une révision n'étant elle-même jamais modifiée).
// La case à cocher (voir `selection`) est la voie normale pour clore une
// phase réalisée : cocher puis signer (QR/PIN) sur plusieurs phases à la
// fois — voir SignerPhases ci-dessous et POST /api/phases/signer. Ce
// formulaire reste utile pour EN_COURS, NON_APPLICABLE (avec
// justification) ou relier une procédure, qui ne sont pas des actes de
// signature.
export function PhaseLigne({
  phase,
  procedures,
  signature,
  selection,
}: {
  phase: { id: string; nom: string; statut: string; justificationNA: string | null; procedureInterneId: string | null };
  procedures: Procedure[];
  signature?: InfoSignature;
  selection?: { coche: boolean; onToggle: () => void };
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(phase.statut);
  const [justificationNA, setJustificationNA] = useState(phase.justificationNA ?? "");
  const [procedureInterneId, setProcedureInterneId] = useState(phase.procedureInterneId ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (statut === "NON_APPLICABLE" && !justificationNA.trim()) {
      setErreur("Une justification est requise pour marquer non applicable.");
      return;
    }
    setEnCours(true);

    const res = await fetch("/api/phases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: phase.id,
        statut,
        justificationNA: statut === "NON_APPLICABLE" ? justificationNA : undefined,
        procedureInterneId: procedureInterneId || null,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid #eee" }}>
      {selection && (
        <input
          type="checkbox"
          checked={selection.coche}
          onChange={selection.onToggle}
          title="Sélectionner pour signer"
          style={{ marginRight: "0.2rem" }}
        />
      )}
      <span style={{ minWidth: 180 }}>{phase.nom}</span>
      <select value={statut} onChange={(e) => setStatut(e.target.value)} style={{ fontSize: "0.85rem", padding: "0.2rem" }}>
        {Object.entries(LIBELLE_STATUT).map(([valeur, libelle]) => (
          <option key={valeur} value={valeur}>
            {libelle}
          </option>
        ))}
      </select>
      {statut === "NON_APPLICABLE" && (
        <input
          type="text"
          placeholder="Justification"
          value={justificationNA}
          onChange={(e) => setJustificationNA(e.target.value)}
          style={{ fontSize: "0.85rem", padding: "0.2rem", minWidth: 160 }}
        />
      )}
      <select value={procedureInterneId} onChange={(e) => setProcedureInterneId(e.target.value)} style={{ fontSize: "0.85rem", padding: "0.2rem", minWidth: 200 }}>
        <option value="">— aucune procédure liée —</option>
        {procedures.map((p) => (
          <option key={p.id} value={p.id}>
            {p.reference} ({p.version}) — {p.titre}
          </option>
        ))}
      </select>
      <button type="submit" disabled={enCours} style={{ fontSize: "0.85rem" }}>
        {enCours ? "..." : "Enregistrer"}
      </button>
      {erreur && <span style={{ color: "crimson", fontSize: "0.8rem" }}>{erreur}</span>}
      {signature && (
        <span style={{ fontSize: "0.75rem", color: "#0ca30c" }}>
          ✓ Signée par {signature.prenom} {signature.nom} le {new Date(signature.dateSignature).toLocaleDateString("fr-FR")}
        </span>
      )}
    </form>
  );
}
