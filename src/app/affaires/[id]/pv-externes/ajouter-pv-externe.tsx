"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";

type Joint = { id: string; numeroAffiche: string };
type Phase = { id: string; nom: string };

// Importe un document produit par un prestataire externe (voir POST
// /api/pv-externes). L'intitulé et le prestataire restent en texte libre.
// `url` peut venir d'un lien déjà hébergé ou d'un dépôt direct dans
// Weldoc (voir POST /api/upload, le "drive").
export function AjouterPvExterne({ affaireId, joints, phases }: { affaireId: string; joints: Joint[]; phases: Phase[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [intitule, setIntitule] = useState("");
  const [prestataire, setPrestataire] = useState("");
  const [url, setUrl] = useState("");
  const [dateDocument, setDateDocument] = useState("");
  const [jointId, setJointId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Importer un document externe
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/pv-externes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        intitule,
        prestataire: prestataire || undefined,
        url,
        dateDocument: dateDocument ? new Date(dateDocument).toISOString() : undefined,
        jointId: jointId || undefined,
        phaseId: phaseId || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'importer ce document.");
      return;
    }
    setIntitule("");
    setPrestataire("");
    setUrl("");
    setDateDocument("");
    setJointId("");
    setPhaseId("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Intitulé (ex. PV de contrôle radiographique sous-traitant, certificat matière...)
        <input required type="text" value={intitule} onChange={(e) => setIntitule(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Prestataire (optionnel)
        <input type="text" value={prestataire} onChange={(e) => setPrestataire(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien / chemin du document
        <input required type="text" value={url} onChange={(e) => setUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <FileUpload onDepose={setUrl} />
      <label>
        Date du document (optionnel)
        <input type="date" value={dateDocument} onChange={(e) => setDateDocument(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      {joints.length > 0 && (
        <label>
          Joint concerné (optionnel — sinon le document concerne l&apos;affaire entière)
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
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Importer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
