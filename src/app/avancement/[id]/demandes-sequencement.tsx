"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";

type Phase = { id: string; nom: string; sequenceNom: string };
type Demande = {
  id: string;
  phasesConcerneesIds: string[];
  motif: string;
  urgent: boolean;
  photoUrl: string | null;
  documentUrl: string | null;
  dateDemande: string;
  statut: string;
  commentaireDecision: string | null;
  conditions: string | null;
  dateDecision: string | null;
  demandeur: { nom: string; prenom: string } | null;
  decideur: { nom: string; prenom: string } | null;
};

const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "en attente",
  ACCEPTEE: "acceptée",
  REFUSEE: "refusée",
  MODIFICATION_DEMANDEE: "modification demandée",
};
const COULEUR_STATUT: Record<string, string> = {
  EN_ATTENTE: "var(--couleur-a-verifier)",
  ACCEPTEE: "var(--couleur-conforme)",
  REFUSEE: "var(--couleur-non-conforme)",
  MODIFICATION_DEMANDEE: "var(--couleur-a-verifier)",
};

// Demande de modification de séquencement (voir le cahier des charges) :
// l'intervenant sur le terrain qui doit s'écarter de l'ordre prévu
// (phases concernées, motif, urgence, photo/document à l'appui) la
// soumet ici ; une personne de niveau 3 décide ensuite (accepter, refuser,
// ou demander une modification), décision tracée et jamais automatique.
// Une demande ACCEPTEE lève le blocage de séquencement pour les phases
// listées (voir src/lib/sequencement.ts, verifierSequencementAutorise) —
// sans ça, PATCH /api/phases et POST /api/phases/signer continuent de
// refuser toute phase dont la séquence précédente n'est pas terminée.
export function DemandesSequencement({
  affaireId,
  phases,
  demandes,
  peutDecider,
}: {
  affaireId: string;
  phases: Phase[];
  demandes: Demande[];
  peutDecider: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [phasesConcerneesIds, setPhasesConcerneesIds] = useState<string[]>([]);
  const [motif, setMotif] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function cocher(id: string, coche: boolean) {
    setPhasesConcerneesIds((liste) => (coche ? [...liste, id] : liste.filter((i) => i !== id)));
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/demandes-sequencement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        phasesConcerneesIds,
        motif,
        urgent,
        photoUrl: photoUrl || undefined,
        documentUrl: documentUrl || undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer la demande.");
      return;
    }
    setOuvert(false);
    setPhasesConcerneesIds([]);
    setMotif("");
    setUrgent(false);
    setPhotoUrl("");
    setDocumentUrl("");
    router.refresh();
  }

  function libellePhases(ids: string[]) {
    return ids
      .map((id) => phases.find((p) => p.id === id))
      .filter((p): p is Phase => p != null)
      .map((p) => `${p.sequenceNom} — ${p.nom}`)
      .join(", ");
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2>Demandes de modification de séquencement</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-discret)" }}>
        Pour s&apos;écarter de l&apos;ordre prévu (ex. souder avant que la préparation d&apos;une séquence
        précédente soit totalement terminée), une demande soumise ici et acceptée par le niveau 3 lève le blocage
        pour les phases concernées — jamais automatiquement.
      </p>

      {!ouvert ? (
        <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
          + Demander une modification de séquencement
        </button>
      ) : (
        <form onSubmit={soumettre} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 560, border: "1px solid var(--couleur-bordure)", padding: "1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.85rem" }}>
            Phases concernées :
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.3rem" }}>
              {phases.map((p) => (
                <label key={p.id} style={{ border: "1px solid var(--couleur-bordure)", padding: "0.15rem 0.4rem", borderRadius: 4 }}>
                  <input type="checkbox" checked={phasesConcerneesIds.includes(p.id)} onChange={(e) => cocher(p.id, e.target.checked)} />{" "}
                  {p.sequenceNom} — {p.nom}
                </label>
              ))}
            </div>
          </div>
          <label style={{ fontSize: "0.85rem" }}>
            Motif
            <textarea required value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.4rem", fontFamily: "inherit" }} />
          </label>
          <label style={{ fontSize: "0.85rem" }}>
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> Urgent
          </label>
          <label style={{ fontSize: "0.85rem" }}>
            Photo à l&apos;appui (optionnel)
            <input type="text" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
          </label>
          <FileUpload onDepose={setPhotoUrl} />
          <label style={{ fontSize: "0.85rem" }}>
            Document à l&apos;appui (optionnel)
            <input type="text" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
          </label>
          <FileUpload onDepose={setDocumentUrl} />
          <div>
            <button type="submit" disabled={enCours || phasesConcerneesIds.length === 0}>
              {enCours ? "Envoi..." : "Soumettre la demande"}
            </button>
            <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
              Annuler
            </button>
          </div>
          {erreur && <p style={{ color: "var(--couleur-non-conforme)", fontSize: "0.85rem" }}>{erreur}</p>}
        </form>
      )}

      {demandes.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-discret)" }}>Aucune demande pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {demandes.map((d) => (
            <DemandeCarte key={d.id} demande={d} libellePhases={libellePhases(d.phasesConcerneesIds)} peutDecider={peutDecider} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DemandeCarte({
  demande: d,
  libellePhases,
  peutDecider,
}: {
  demande: Demande;
  libellePhases: string;
  peutDecider: boolean;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState<"ACCEPTEE" | "REFUSEE" | "MODIFICATION_DEMANDEE">("ACCEPTEE");
  const [commentaireDecision, setCommentaireDecision] = useState("");
  const [conditions, setConditions] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function decider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/demandes-sequencement/${d.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut, commentaireDecision: commentaireDecision || undefined, conditions: conditions || undefined }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer la décision.");
      return;
    }
    router.refresh();
  }

  return (
    <li style={{ border: "1px solid var(--couleur-bordure)", padding: "0.6rem", marginBottom: "0.6rem" }}>
      <p style={{ margin: 0 }}>
        <strong style={{ color: COULEUR_STATUT[d.statut] }}>{LIBELLE_STATUT[d.statut]}</strong>
        {d.urgent && <span style={{ color: "var(--couleur-non-conforme)", marginLeft: "0.4rem" }}>(urgent)</span>} — {libellePhases}
      </p>
      <p style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>{d.motif}</p>
      <p style={{ margin: "0.2rem 0", fontSize: "0.8rem", color: "var(--couleur-texte-discret)" }}>
        Demandée par {d.demandeur ? `${d.demandeur.prenom} ${d.demandeur.nom}` : "—"} le{" "}
        {new Date(d.dateDemande).toLocaleDateString("fr-FR")}
        {d.photoUrl && (
          <>
            {" · "}
            <a href={d.photoUrl} target="_blank" rel="noreferrer">
              photo
            </a>
          </>
        )}
        {d.documentUrl && (
          <>
            {" · "}
            <a href={d.documentUrl} target="_blank" rel="noreferrer">
              document
            </a>
          </>
        )}
      </p>
      {d.dateDecision && (
        <p style={{ margin: "0.2rem 0", fontSize: "0.8rem", color: "var(--couleur-texte-discret)" }}>
          Décidée par {d.decideur ? `${d.decideur.prenom} ${d.decideur.nom}` : "—"} le{" "}
          {new Date(d.dateDecision).toLocaleDateString("fr-FR")}
          {d.commentaireDecision && ` — ${d.commentaireDecision}`}
          {d.conditions && ` (conditions : ${d.conditions})`}
        </p>
      )}
      {peutDecider && d.statut === "EN_ATTENTE" && (
        <form onSubmit={decider} style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.4rem", fontSize: "0.85rem" }}>
          <select value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)} style={{ padding: "0.3rem" }}>
            <option value="ACCEPTEE">Accepter</option>
            <option value="REFUSEE">Refuser</option>
            <option value="MODIFICATION_DEMANDEE">Demander une modification</option>
          </select>
          <input
            type="text"
            placeholder="Commentaire (optionnel)"
            value={commentaireDecision}
            onChange={(e) => setCommentaireDecision(e.target.value)}
            style={{ padding: "0.3rem", minWidth: 160 }}
          />
          <input
            type="text"
            placeholder="Conditions (optionnel)"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            style={{ padding: "0.3rem", minWidth: 160 }}
          />
          <button type="submit" disabled={enCours}>
            {enCours ? "..." : "Valider la décision"}
          </button>
          {erreur && <span style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</span>}
        </form>
      )}
    </li>
  );
}
