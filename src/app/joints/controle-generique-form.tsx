"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";
import { EditeurIndications } from "./editeur-indications";
import { indicationVersJson, type IndicationFormulaire } from "./indications";

// Formulaire partagé pour les contrôles à indications (visuel, ressuage,
// magnétoscopie, radiographie, ultrasons — voir src/lib/controles.ts) :
// même forme jointId/procédure/indications/signature, seul l'endpoint
// change. Le ressuage l'enveloppe (voir controle-ressuage-form.tsx) pour
// ajouter le contrôle visuel préalable obligatoire et les consommables.
export function ControleGeneriqueForm({
  endpoint,
  jointId,
  onCree,
  onAnnuler,
  extra,
  extraJson,
}: {
  endpoint: string;
  jointId: string;
  onCree: () => void;
  onAnnuler: () => void;
  // Champs additionnels propres à un type de contrôle (ex. ressuage),
  // insérés dans le formulaire et fusionnés dans le corps envoyé.
  extra?: React.ReactNode;
  extraJson?: () => Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [procedureRef, setProcedureRef] = useState("");
  const [procedureVersion, setProcedureVersion] = useState("");
  const [indications, setIndications] = useState<IndicationFormulaire[]>([]);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    const champsExtra = extraJson ? extraJson() : {};
    if (champsExtra === null) {
      setErreur("Champs additionnels incomplets.");
      return;
    }

    setEnCours(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jointId,
        procedureRef,
        procedureVersion: procedureVersion || undefined,
        indications: indications.map(indicationVersJson),
        signatureId: signatureId ?? undefined,
        ...champsExtra,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer ce contrôle (au moins une indication requise).");
      return;
    }
    onCree();
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ border: "1px solid #ddd", padding: "0.6rem", marginTop: "0.4rem", maxWidth: 600 }}>
      <label style={{ fontSize: "0.85rem" }}>
        Référence de la procédure
        <input required type="text" value={procedureRef} onChange={(e) => setProcedureRef(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Version de la procédure (optionnel)
        <input type="text" value={procedureVersion} onChange={(e) => setProcedureVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
      </label>
      {extra}
      <EditeurIndications indications={indications} onChange={setIndications} />
      <div style={{ marginTop: "0.4rem" }}>
        <p style={{ fontSize: "0.8rem", margin: "0 0 0.2rem 0" }}>Signature du contrôleur (matricule/QR + PIN) :</p>
        <SignerQrPin
          documentType={endpoint}
          documentId={jointId}
          versionDocument={procedureRef || "v1"}
          onSigne={setSignatureId}
        />
      </div>
      <div style={{ marginTop: "0.4rem" }}>
        <button type="submit" disabled={enCours || indications.length === 0 || !signatureId}>
          {enCours ? "Enregistrement..." : "Enregistrer le contrôle"}
        </button>
        <button type="button" onClick={onAnnuler} style={{ marginLeft: "0.4rem" }}>
          Annuler
        </button>
        {erreur && <span style={{ color: "crimson", fontSize: "0.85rem", marginLeft: "0.4rem" }}>{erreur}</span>}
      </div>
    </form>
  );
}
