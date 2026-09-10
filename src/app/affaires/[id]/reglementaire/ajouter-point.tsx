"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Joint = { id: string; numeroAffiche: string };
type Phase = { id: string; nom: string };

const STATUTS_INITIAUX = [
  { valeur: "NON_BLOQUANT", libelle: "Non bloquant" },
  { valeur: "BLOQUANT", libelle: "Bloquant" },
  { valeur: "SOUS_RESERVE", libelle: "Sous réserve" },
  { valeur: "ATTENTE_DECISION", libelle: "Attente décision" },
] as const;

// Ouvre un nouveau point réglementaire avec son statut initial (voir POST
// /api/points-reglementaires). L'intitulé et le référentiel restent en
// texte libre : leur liste dépend entièrement du projet/référentiel
// client, jamais imposée par Weldoc.
export function AjouterPoint({ affaireId, joints, phases }: { affaireId: string; joints: Joint[]; phases: Phase[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [intitule, setIntitule] = useState("");
  const [referentiel, setReferentiel] = useState("");
  const [statut, setStatut] = useState<(typeof STATUTS_INITIAUX)[number]["valeur"]>("BLOQUANT");
  const [commentaire, setCommentaire] = useState("");
  const [jointId, setJointId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Ouvrir un point réglementaire
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/points-reglementaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        intitule,
        referentiel: referentiel || undefined,
        statut,
        commentaire: commentaire || undefined,
        jointId: jointId || undefined,
        phaseId: phaseId || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'ouvrir ce point réglementaire.");
      return;
    }
    setIntitule("");
    setReferentiel("");
    setStatut("BLOQUANT");
    setCommentaire("");
    setJointId("");
    setPhaseId("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid var(--couleur-bordure)", padding: "1rem" }}>
      <label>
        Intitulé (ex. Attestation de conformité OHA, Déclaration de conformité exploitant...)
        <input required type="text" value={intitule} onChange={(e) => setIntitule(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Référentiel (optionnel)
        <input type="text" value={referentiel} onChange={(e) => setReferentiel(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Statut initial
        <select value={statut} onChange={(e) => setStatut(e.target.value as (typeof STATUTS_INITIAUX)[number]["valeur"])} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          {STATUTS_INITIAUX.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.libelle}
            </option>
          ))}
        </select>
      </label>
      {joints.length > 0 && (
        <label>
          Joint concerné (optionnel — sinon le point concerne l&apos;affaire entière)
          <select value={jointId} onChange={(e) => setJointId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
            <option value="">— aucun —</option>
            {joints.map((j) => (
              <option key={j.id} value={j.id}>
                {j.numeroAffiche}
              </option>
            ))}
          </select>
        </label>
      )}
      {phases.length > 0 && (
        <label>
          Phase concernée (optionnel)
          <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
            <option value="">— aucune —</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Commentaire (optionnel)
        <input type="text" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Ouvrir le point"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
    </form>
  );
}
