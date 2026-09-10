"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";

type Phase = { id: string; nom: string };
type Joint = { id: string; numeroAffiche: string };
type Fnc = { id: string; reference: string };

// Ajoute une photo au book photo (voir POST /api/photos). `url` peut
// venir d'un lien déjà hébergé ou d'un dépôt direct dans Weldoc (voir
// POST /api/upload, le "drive").
export function AjouterPhoto({
  affaireId,
  phases,
  joints,
  fncs,
}: {
  affaireId: string;
  phases: Phase[];
  joints: Joint[];
  fncs: Fnc[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [jointId, setJointId] = useState("");
  const [fncId, setFncId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        url,
        commentaire: commentaire || undefined,
        phaseId: phaseId || undefined,
        jointId: jointId || undefined,
        fncId: fncId || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'ajouter cette photo (vérifiez l'adresse).");
      return;
    }
    setUrl("");
    setCommentaire("");
    setPhaseId("");
    setJointId("");
    setFncId("");
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid var(--couleur-bordure)", padding: "1rem" }}>
      <label>
        Adresse de la photo (déjà hébergée quelque part)
        <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <FileUpload onDepose={setUrl} />
      <label>
        Légende / commentaire (optionnel)
        <input type="text" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      {joints.length > 0 && (
        <label>
          Joint concerné (optionnel)
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
      {fncs.length > 0 && (
        <label>
          FNC concernée (optionnel)
          <select value={fncId} onChange={(e) => setFncId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
            <option value="">— aucune —</option>
            {fncs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.reference}
              </option>
            ))}
          </select>
        </label>
      )}
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Ajout..." : "Ajouter la photo"}
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
    </form>
  );
}
