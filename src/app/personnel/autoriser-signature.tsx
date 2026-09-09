"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Types de document déjà utilisés ailleurs dans l'application pour une
// signature (voir src/lib/signature.ts, documentType) — reprendre
// exactement un de ces intitulés pour que l'autorisation s'applique
// réellement au bon endroit. Toute autre valeur reste possible (ex. un
// futur type de document) mais n'aura d'effet que le jour où ce type sera
// vraiment utilisé pour signer.
const TYPES_DOCUMENT_CONNUS = [
  "TQC",
  "FICHE_TECHNIQUE_SOUDAGE",
  "ETAT_DES_LIEUX",
  "POINT_REGLEMENTAIRE",
  "QualificationEvenement",
  "RAPPORT_FIN_FABRICATION",
  "ControleDimensionnel",
  "/api/controles-visuels",
  "/api/controles-ressuage",
  "/api/controles-magnetoscopie",
  "/api/controles-radiographie",
  "/api/controles-ultrasons",
];

// Accorde à une personne le droit de signer un type de document (voir
// POST /api/autorisations-signature, réservé au niveau 3). Tant qu'aucune
// autorisation n'existe pour un type donné, tout le monde garde le droit
// de signer ce type-là comme aujourd'hui (contrôle par niveau uniquement)
// — accorder une première autorisation sur un type restreint désormais
// ce type aux seules personnes autorisées.
export function AutoriserSignature({ personnelId }: { personnelId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
        + Autoriser à signer
      </button>
    );
  }

  async function accorder(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/autorisations-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personnelId, documentType }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'accorder cette autorisation.");
      return;
    }
    setDocumentType("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={accorder} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.5rem" }}>
      <input
        required
        list="types-document-connus"
        type="text"
        placeholder="type de document"
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
        style={{ fontSize: "0.85rem" }}
      />
      <datalist id="types-document-connus">
        {TYPES_DOCUMENT_CONNUS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Accorder"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "crimson", fontSize: "0.8rem" }}>{erreur}</span>}
    </form>
  );
}
