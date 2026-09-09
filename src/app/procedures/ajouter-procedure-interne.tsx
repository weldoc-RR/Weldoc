"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Enregistre une procédure interne (ou une nouvelle révision : même
// référence, version différente) — voir POST /api/procedures-internes.
// `type` reste en texte libre (procédure, instruction, formulaire, PV,
// fiche technique... — ces catégories varient d'une entreprise à l'autre).
export function AjouterProcedureInterne() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [version, setVersion] = useState("Rev 0");
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [dateEmission, setDateEmission] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/procedures-internes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        version,
        titre,
        type: type || undefined,
        documentUrl: documentUrl || undefined,
        dateEmission: new Date(dateEmission).toISOString(),
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de créer cette procédure.");
      return;
    }
    setReference("");
    setVersion("Rev 0");
    setTitre("");
    setType("");
    setDocumentUrl("");
    setDateEmission("");
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480 }}>
      <label>
        Référence (ex. PROC-CND-001)
        <input required type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Version
        <input required type="text" value={version} onChange={(e) => setVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Titre
        <input required type="text" value={titre} onChange={(e) => setTitre(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Type (ex. procédure, instruction, formulaire, PV, fiche technique...)
        <input type="text" value={type} onChange={(e) => setType(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le document (optionnel)
        <input type="text" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date d&apos;émission
        <input required type="date" value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <button type="submit" disabled={enCours}>
        {enCours ? "Création..." : "Créer la procédure"}
      </button>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
