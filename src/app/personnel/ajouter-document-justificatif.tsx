"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";

type Personnel = { id: string; nom: string; prenom: string };

// Ajoute un document justificatif (voir POST
// /api/documents-justificatifs-personnel) : pièce libre attachée à une
// personne (pièce d'identité, permis, CACES, autorisation spécifique...),
// au-delà des qualifications/habilitations/formations/acuités visuelles
// déjà modélisées. Un renouvellement se fait en ajoutant un nouveau
// document, jamais en modifiant le précédent.
export function AjouterDocumentJustificatif({ personnel }: { personnel: Personnel[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [intitule, setIntitule] = useState("");
  const [reference, setReference] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [dateDocument, setDateDocument] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Ajouter un document justificatif
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/documents-justificatifs-personnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId,
        intitule,
        reference: reference || undefined,
        documentUrl,
        dateDocument: dateDocument ? new Date(dateDocument).toISOString() : undefined,
        dateExpiration: dateExpiration ? new Date(dateExpiration).toISOString() : undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'ajouter ce document.");
      return;
    }
    setIntitule("");
    setReference("");
    setDocumentUrl("");
    setDateDocument("");
    setDateExpiration("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid var(--couleur-bordure)", padding: "1rem" }}>
      <label>
        Personne
        <select value={personnelId} onChange={(e) => setPersonnelId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          {personnel.map((p) => (
            <option key={p.id} value={p.id}>
              {p.prenom} {p.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        Intitulé (ex. carte d&apos;identité, permis CACES R486, autorisation site...)
        <input required type="text" value={intitule} onChange={(e) => setIntitule(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Référence (optionnel)
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le document
        <input required type="text" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <FileUpload onDepose={setDocumentUrl} />
      <label>
        Date du document (optionnel)
        <input type="date" value={dateDocument} onChange={(e) => setDateDocument(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date d&apos;expiration (optionnel)
        <input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
    </form>
  );
}
