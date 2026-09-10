"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

export type ReserveVM = { id: string; description: string; transmiseAuClient: boolean; dateAjout: string };
export type PhotoVM = { id: string; url: string; commentaire: string | null; dateAjout: string; auteur: { nom: string; prenom: string } };
export type ConstatVM = {
  id: string;
  zone: string | null;
  dateConstat: string;
  observations: string | null;
  degradationsConstatees: string | null;
  documentsEntree: string | null;
  signatureId: string | null;
  redacteur: { nom: string; prenom: string };
  reserves: ReserveVM[];
  photos: PhotoVM[];
};

// Une carte de constat (prise en charge ou restitution) : modifiable
// (constat, réserves, photos) tant qu'elle n'est pas signée ; une fois
// signée, affichage seul (voir PATCH /api/etats-des-lieux/[id], même
// principe que la fiche technique de suivi de soudage).
export function ConstatCard({ constat, affaireId }: { constat: ConstatVM; affaireId: string }) {
  const router = useRouter();
  const dejaSigne = Boolean(constat.signatureId);

  const [modeEdition, setModeEdition] = useState(false);
  const [zone, setZone] = useState(constat.zone ?? "");
  const [observations, setObservations] = useState(constat.observations ?? "");
  const [degradations, setDegradations] = useState(constat.degradationsConstatees ?? "");
  const [documentsEntree, setDocumentsEntree] = useState(constat.documentsEntree ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [reserveDescription, setReserveDescription] = useState("");
  const [reserveTransmise, setReserveTransmise] = useState(false);
  const [erreurReserve, setErreurReserve] = useState<string | null>(null);

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCommentaire, setPhotoCommentaire] = useState("");
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);

  const [signatureId, setSignatureId] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/etats-des-lieux/${constat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone: zone || undefined,
        observations: observations || undefined,
        degradationsConstatees: degradations || undefined,
        documentsEntree: documentsEntree || undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer.");
      return;
    }
    setModeEdition(false);
    router.refresh();
  }

  async function signer() {
    if (!signatureId) return;
    setEnCours(true);
    const res = await fetch(`/api/etats-des-lieux/${constat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureId }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de finaliser la signature.");
      return;
    }
    router.refresh();
  }

  async function ajouterReserve(e: React.FormEvent) {
    e.preventDefault();
    setErreurReserve(null);
    const res = await fetch(`/api/etats-des-lieux/${constat.id}/reserves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: reserveDescription, transmiseAuClient: reserveTransmise }),
    });
    if (!res.ok) {
      setErreurReserve("Impossible d'ajouter cette réserve.");
      return;
    }
    setReserveDescription("");
    setReserveTransmise(false);
    router.refresh();
  }

  async function ajouterPhoto(e: React.FormEvent) {
    e.preventDefault();
    setErreurPhoto(null);
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ affaireId, etatDesLieuxId: constat.id, url: photoUrl, commentaire: photoCommentaire || undefined }),
    });
    if (!res.ok) {
      setErreurPhoto("Impossible d'ajouter cette photo.");
      return;
    }
    setPhotoUrl("");
    setPhotoCommentaire("");
    router.refresh();
  }

  return (
    <div style={{ border: "1px solid var(--couleur-bordure)", borderRadius: 6, padding: "1rem", marginBottom: "1.25rem" }}>
      <p style={{ fontSize: "0.9rem", color: "var(--couleur-texte-attenue)", margin: "0 0 0.5rem 0" }}>
        Rédigé par {constat.redacteur.prenom} {constat.redacteur.nom} le {new Date(constat.dateConstat).toLocaleDateString("fr-FR")}
        {constat.zone && ` — zone : ${constat.zone}`}
        {dejaSigne && <span style={{ color: "#0ca30c" }}> — ✓ signé (lecture seule)</span>}
      </p>

      {modeEdition ? (
        <form onSubmit={enregistrer} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: 560 }}>
          <label style={{ fontSize: "0.95rem" }}>
            Zone concernée
            <input type="text" value={zone} onChange={(e) => setZone(e.target.value)} style={{ display: "block", width: "100%" }} />
          </label>
          <label style={{ fontSize: "0.95rem" }}>
            Observations
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} style={{ display: "block", width: "100%", padding: "0.5rem", fontFamily: "inherit", fontSize: "1rem" }} />
          </label>
          <label style={{ fontSize: "0.95rem" }}>
            Dégradations constatées
            <textarea value={degradations} onChange={(e) => setDegradations(e.target.value)} rows={3} style={{ display: "block", width: "100%", padding: "0.5rem", fontFamily: "inherit", fontSize: "1rem" }} />
          </label>
          <label style={{ fontSize: "0.95rem" }}>
            Documents d&apos;entrée reçus (bordereau, plan...)
            <input type="text" value={documentsEntree} onChange={(e) => setDocumentsEntree(e.target.value)} style={{ display: "block", width: "100%" }} />
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="submit" disabled={enCours}>
              {enCours ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setModeEdition(false)}>
              Fermer
            </button>
          </div>
          {erreur && <p style={{ color: "crimson", fontSize: "0.9rem" }}>{erreur}</p>}
        </form>
      ) : (
        <div style={{ fontSize: "0.95rem" }}>
          <p>
            <strong>Observations :</strong> {constat.observations || "—"}
          </p>
          <p>
            <strong>Dégradations constatées :</strong> {constat.degradationsConstatees || "—"}
          </p>
          <p>
            <strong>Documents d&apos;entrée :</strong> {constat.documentsEntree || "—"}
          </p>
          {!dejaSigne && (
            <button type="button" onClick={() => setModeEdition(true)}>
              Modifier
            </button>
          )}
        </div>
      )}

      <h4 style={{ marginBottom: "0.3rem" }}>Réserves</h4>
      {constat.reserves.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#898781" }}>Aucune réserve.</p>
      ) : (
        <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem" }}>
          {constat.reserves.map((r) => (
            <li key={r.id}>
              {r.description}
              {r.transmiseAuClient && <span style={{ color: "#c98a1f" }}> (transmise au client)</span>} —{" "}
              {new Date(r.dateAjout).toLocaleDateString("fr-FR")}
            </li>
          ))}
        </ul>
      )}
      {!dejaSigne && (
        <form onSubmit={ajouterReserve} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem" }}>
          <input
            required
            type="text"
            placeholder="Décrire la réserve"
            value={reserveDescription}
            onChange={(e) => setReserveDescription(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <label style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <input type="checkbox" checked={reserveTransmise} onChange={(e) => setReserveTransmise(e.target.checked)} /> transmise au client
          </label>
          <button type="submit">Ajouter</button>
          {erreurReserve && <span style={{ color: "crimson", fontSize: "0.9rem" }}>{erreurReserve}</span>}
        </form>
      )}
      <p style={{ fontSize: "0.75rem", color: "#898781", marginTop: "-0.3rem" }}>
        Un problème plus grave se déclare comme FNC (module FNC existant, sur cette même affaire).
      </p>

      <h4 style={{ marginBottom: "0.3rem" }}>Photos</h4>
      {constat.photos.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#898781" }}>Aucune photo.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem", marginBottom: "0.6rem" }}>
          {constat.photos.map((p) => (
            <li key={p.id}>
              <img src={p.url} alt={p.commentaire ?? "Photo"} style={{ width: "100%", display: "block" }} />
              {p.commentaire && <p style={{ fontSize: "0.75rem", margin: "0.1rem 0 0 0" }}>{p.commentaire}</p>}
            </li>
          ))}
        </ul>
      )}
      {!dejaSigne && (
        <form onSubmit={ajouterPhoto} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem" }}>
          <input
            required
            type="url"
            placeholder="Adresse de la photo"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <input
            type="text"
            placeholder="Légende (optionnel)"
            value={photoCommentaire}
            onChange={(e) => setPhotoCommentaire(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button type="submit">Ajouter</button>
          {erreurPhoto && <span style={{ color: "crimson", fontSize: "0.9rem" }}>{erreurPhoto}</span>}
        </form>
      )}

      {!dejaSigne && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ fontSize: "0.9rem", margin: "0 0 0.4rem 0" }}>
            Signer pour clore ce constat (matricule/QR + PIN) — plus aucune modification possible ensuite :
          </p>
          {signatureId ? (
            <button type="button" onClick={signer} disabled={enCours}>
              {enCours ? "..." : "Confirmer et signer"}
            </button>
          ) : (
            <SignerQrPin documentType="ETAT_DES_LIEUX" documentId={constat.id} versionDocument="v1" onSigne={setSignatureId} />
          )}
        </div>
      )}
    </div>
  );
}
