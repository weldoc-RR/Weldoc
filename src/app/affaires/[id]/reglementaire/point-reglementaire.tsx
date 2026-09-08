"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

type Evenement = {
  id: string;
  statut: string;
  commentaire: string | null;
  date: string | Date;
  auteur: { nom: string; prenom: string };
};

type Point = {
  id: string;
  intitule: string;
  referentiel: string | null;
  joint: { numero: string; indiceReparation: number } | null;
  phase: { nom: string } | null;
  evenements: Evenement[];
};

const LIBELLE_STATUT: Record<string, string> = {
  NON_BLOQUANT: "non bloquant",
  BLOQUANT: "bloquant",
  SOUS_RESERVE: "sous réserve",
  ATTENTE_DECISION: "attente décision",
  DEBLOCAGE_AUTORISE: "déblocage autorisé",
};

function couleurStatut(statut: string): string {
  if (statut === "BLOQUANT") return "#d03b3b";
  if (statut === "SOUS_RESERVE" || statut === "ATTENTE_DECISION") return "darkorange";
  return "#0ca30c";
}

const STATUTS_POSSIBLES = ["NON_BLOQUANT", "BLOQUANT", "SOUS_RESERVE", "ATTENTE_DECISION", "DEBLOCAGE_AUTORISE"] as const;

// Une carte par point réglementaire : statut actuel (dernier événement),
// historique repliable, et un mini-formulaire pour changer le statut (voir
// POST /api/points-reglementaires/[id]/evenements). Le passage en
// "déblocage autorisé" exige une signature QR/matricule + PIN, et n'est
// même proposé qu'aux personnes de niveau 3 (peutDebloquer) — vérifié à
// nouveau côté serveur de toute façon.
export function PointReglementaireCarte({ point, peutDebloquer }: { point: Point; peutDebloquer: boolean }) {
  const router = useRouter();
  const statutActuel = point.evenements[0]?.statut ?? "NON_BLOQUANT";
  const historique = point.evenements.slice(1);

  const [nouveauStatut, setNouveauStatut] = useState<(typeof STATUTS_POSSIBLES)[number]>(statutActuel as (typeof STATUTS_POSSIBLES)[number]);
  const [commentaire, setCommentaire] = useState("");
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const changementReel = nouveauStatut !== statutActuel;
  const exigeSignature = nouveauStatut === "DEBLOCAGE_AUTORISE";

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/points-reglementaires/${point.id}/evenements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: nouveauStatut,
        commentaire: commentaire || undefined,
        signatureId: signatureId ?? undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer ce changement de statut.");
      return;
    }
    setCommentaire("");
    setSignatureId(null);
    router.refresh();
  }

  return (
    <li style={{ marginBottom: "1rem", border: "1px solid #ddd", padding: "0.75rem" }}>
      <strong>{point.intitule}</strong>
      {point.referentiel && ` — ${point.referentiel}`}
      {point.joint && ` — joint ${point.joint.numero}${point.joint.indiceReparation > 0 ? ` R${point.joint.indiceReparation}` : ""}`}
      {point.phase && ` — phase ${point.phase.nom}`}
      <div style={{ marginTop: "0.3rem" }}>
        Statut actuel : <strong style={{ color: couleurStatut(statutActuel) }}>{LIBELLE_STATUT[statutActuel]}</strong>
      </div>

      {historique.length > 0 && (
        <details style={{ fontSize: "0.8rem", color: "#52514e", marginTop: "0.3rem" }}>
          <summary>Historique ({historique.length})</summary>
          <ul>
            {point.evenements.map((e) => (
              <li key={e.id}>
                {LIBELLE_STATUT[e.statut]} — {e.auteur.prenom} {e.auteur.nom} —{" "}
                {new Date(e.date).toLocaleDateString("fr-FR")}
                {e.commentaire && ` — ${e.commentaire}`}
              </li>
            ))}
          </ul>
        </details>
      )}

      <form onSubmit={enregistrer} style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: 400 }}>
        <label style={{ fontSize: "0.85rem" }}>
          Changer le statut
          <select
            value={nouveauStatut}
            onChange={(e) => {
              setNouveauStatut(e.target.value as (typeof STATUTS_POSSIBLES)[number]);
              setSignatureId(null);
            }}
            style={{ display: "block", width: "100%", padding: "0.3rem" }}
          >
            {STATUTS_POSSIBLES.filter((s) => s !== "DEBLOCAGE_AUTORISE" || peutDebloquer).map((s) => (
              <option key={s} value={s}>
                {LIBELLE_STATUT[s]}
              </option>
            ))}
          </select>
        </label>
        {changementReel && (
          <>
            <input
              type="text"
              placeholder="Commentaire (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              style={{ padding: "0.3rem", fontSize: "0.85rem" }}
            />
            {exigeSignature ? (
              !signatureId ? (
                <>
                  <p style={{ fontSize: "0.8rem", margin: "0.2rem 0" }}>
                    Signature requise pour autoriser le déblocage :
                  </p>
                  <SignerQrPin
                    documentType="POINT_REGLEMENTAIRE"
                    documentId={point.id}
                    versionDocument={new Date().toISOString().slice(0, 10)}
                    onSigne={setSignatureId}
                  />
                </>
              ) : (
                <button type="submit" disabled={enCours}>
                  {enCours ? "Enregistrement..." : "Confirmer le déblocage"}
                </button>
              )
            ) : (
              <button type="submit" disabled={enCours}>
                {enCours ? "Enregistrement..." : "Enregistrer"}
              </button>
            )}
          </>
        )}
        {erreur && <span style={{ color: "crimson", fontSize: "0.85rem" }}>{erreur}</span>}
      </form>
    </li>
  );
}
