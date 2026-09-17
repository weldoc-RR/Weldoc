"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignaturesDetailleesPhase, type SignatureDetaillee } from "./signatures-detaillees-phase";

type Procedure = { id: string; reference: string; version: string; titre: string };
type InfoSignature = { nom: string; prenom: string; dateSignature: string };

const LIBELLE_STATUT: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  NON_APPLICABLE: "Non applicable",
};

// Fait avancer une phase et/ou change la procédure interne applicable, le
// contrôle technique attendu, en un seul PATCH /api/phases (voir le
// cahier des charges, "DOCUMENTATION ET PROCÉDURES INTERNES" et "FICHE DE
// SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR PHASE"). La case à cocher
// (voir `selection`) reste la voie normale pour clore une phase réalisée :
// cocher puis signer (QR/PIN) sur plusieurs phases à la fois — voir
// SignerPhases ci-dessous et POST /api/phases/signer. Ce formulaire reste
// utile pour EN_COURS, NON_APPLICABLE (avec justification), relier une
// procédure ou détailler le contrôle technique, qui ne sont pas des actes
// de signature.
export function PhaseLigne({
  phase,
  procedures,
  signature,
  signaturesDetaillees,
  selection,
  peutSupprimer,
}: {
  phase: {
    id: string;
    nom: string;
    statut: string;
    justificationNA: string | null;
    procedureInterneId: string | null;
    libelleControleTechnique: string | null;
    attendusControleTechnique: string | null;
    numeroAdrSpecifique: string | null;
  };
  procedures: Procedure[];
  signature?: InfoSignature;
  signaturesDetaillees: SignatureDetaillee[];
  selection?: { coche: boolean; onToggle: () => void };
  peutSupprimer: boolean;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(phase.statut);
  const [justificationNA, setJustificationNA] = useState(phase.justificationNA ?? "");
  const [procedureInterneId, setProcedureInterneId] = useState(phase.procedureInterneId ?? "");
  const [libelleControleTechnique, setLibelleControleTechnique] = useState(phase.libelleControleTechnique ?? "");
  const [attendusControleTechnique, setAttendusControleTechnique] = useState(phase.attendusControleTechnique ?? "");
  const [numeroAdrSpecifique, setNumeroAdrSpecifique] = useState(phase.numeroAdrSpecifique ?? "");
  const [afficherControleTechnique, setAfficherControleTechnique] = useState(
    Boolean(phase.libelleControleTechnique || phase.attendusControleTechnique || phase.numeroAdrSpecifique || signaturesDetaillees.length > 0)
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);

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
        libelleControleTechnique: libelleControleTechnique || null,
        attendusControleTechnique: attendusControleTechnique || null,
        numeroAdrSpecifique: numeroAdrSpecifique || null,
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

  async function supprimer() {
    if (!confirm(`Supprimer la phase "${phase.nom}" ?`)) return;
    setSuppression(true);
    setErreurSuppression(null);

    const res = await fetch("/api/phases", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: phase.id }),
    });

    setSuppression(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreurSuppression(corps?.error ?? "Impossible de supprimer.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ padding: "0.4rem 0", borderBottom: "1px solid var(--couleur-bordure)" }}>
      <form onSubmit={enregistrer} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
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
        <button
          type="button"
          onClick={() => setAfficherControleTechnique((v) => !v)}
          style={{ fontSize: "0.8rem", background: "none", border: "none", color: "var(--couleur-primaire)", cursor: "pointer" }}
        >
          {afficherControleTechnique ? "Masquer le contrôle technique" : "Contrôle technique / signatures"}
        </button>
        {peutSupprimer && (
          <button
            type="button"
            onClick={supprimer}
            disabled={suppression}
            style={{ fontSize: "0.8rem", color: "var(--couleur-non-conforme)", background: "none", border: "1px solid var(--couleur-non-conforme)", borderRadius: 4, padding: "0.15rem 0.4rem" }}
          >
            {suppression ? "..." : "Supprimer"}
          </button>
        )}
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
        {erreurSuppression && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreurSuppression}</span>}
        {signature && (
          <span style={{ fontSize: "0.75rem", color: "var(--couleur-conforme)" }}>
            ✓ Signée par {signature.prenom} {signature.nom} le {new Date(signature.dateSignature).toLocaleDateString("fr-FR")}
          </span>
        )}
      </form>

      {afficherControleTechnique && (
        <div style={{ marginTop: "0.5rem", marginLeft: "1.5rem", padding: "0.6rem", background: "var(--couleur-fond-discret)", borderRadius: "var(--rayon-carte)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              placeholder="Libellé du contrôle technique"
              value={libelleControleTechnique}
              onChange={(e) => setLibelleControleTechnique(e.target.value)}
              style={{ fontSize: "0.85rem", padding: "0.2rem", minWidth: 220 }}
            />
            <input
              type="text"
              placeholder="Attendus du contrôle technique"
              value={attendusControleTechnique}
              onChange={(e) => setAttendusControleTechnique(e.target.value)}
              style={{ fontSize: "0.85rem", padding: "0.2rem", minWidth: 260 }}
            />
            <input
              type="text"
              placeholder="Numéro ADR spécifique"
              value={numeroAdrSpecifique}
              onChange={(e) => setNumeroAdrSpecifique(e.target.value)}
              style={{ fontSize: "0.85rem", padding: "0.2rem", minWidth: 160 }}
            />
            <button type="button" onClick={enregistrer} disabled={enCours} style={{ fontSize: "0.8rem" }}>
              Enregistrer le contrôle technique
            </button>
          </div>
          <SignaturesDetailleesPhase phaseId={phase.id} signatures={signaturesDetaillees} />
        </div>
      )}
    </div>
  );
}
