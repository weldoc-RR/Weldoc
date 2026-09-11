"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";
import { EditeurIndications } from "./editeur-indications";
import { indicationVersJson, type IndicationFormulaire } from "./indications";
import { EditeurConditionsExamen } from "./editeur-conditions-examen";
import { conditionsExamenVide, conditionsExamenVersJson, type ConditionsExamenFormulaire } from "./conditions-examen";

type Outil = { id: string; reference: string; type: string };

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
  outils,
}: {
  endpoint: string;
  jointId: string;
  onCree: () => void;
  onAnnuler: () => void;
  // Champs additionnels propres à un type de contrôle (ex. ressuage),
  // insérés dans le formulaire et fusionnés dans le corps envoyé.
  extra?: React.ReactNode;
  extraJson?: () => Record<string, unknown> | null;
  // Équipement/banc de la bibliothèque métrologie (voir Outil) : fourni
  // seulement par les méthodes concernées (magnétoscopie, radiographie,
  // ultrasons — le contrôle visuel n'en a pas besoin), sinon aucun
  // sélecteur ne s'affiche.
  outils?: Outil[];
}) {
  const router = useRouter();
  const [procedureRef, setProcedureRef] = useState("");
  const [procedureVersion, setProcedureVersion] = useState("");
  const [outilId, setOutilId] = useState("");
  const [indications, setIndications] = useState<IndicationFormulaire[]>([]);
  const [conditionsExamen, setConditionsExamen] = useState<ConditionsExamenFormulaire>(conditionsExamenVide());
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
        outilId: outils ? outilId || undefined : undefined,
        procedureRef,
        procedureVersion: procedureVersion || undefined,
        indications: indications.map(indicationVersJson),
        signatureId: signatureId ?? undefined,
        ...conditionsExamenVersJson(conditionsExamen),
        ...champsExtra,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer ce contrôle (au moins une indication requise).");
      return;
    }
    onCree();
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ border: "1px solid var(--couleur-bordure)", borderRadius: 6, padding: "1rem", marginTop: "0.5rem", maxWidth: 660 }}>
      <label style={{ fontSize: "0.95rem", display: "block" }}>
        Référence de la procédure
        <input required type="text" value={procedureRef} onChange={(e) => setProcedureRef(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
        Version de la procédure (optionnel)
        <input type="text" value={procedureVersion} onChange={(e) => setProcedureVersion(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      {outils && (
        <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
          Équipement utilisé (optionnel)
          <select value={outilId} onChange={(e) => setOutilId(e.target.value)} style={{ display: "block", width: "100%" }}>
            <option value="">— non précisé —</option>
            {outils.map((o) => (
              <option key={o.id} value={o.id}>
                {o.reference} ({o.type})
              </option>
            ))}
          </select>
        </label>
      )}
      {extra}
      <EditeurIndications indications={indications} onChange={setIndications} />
      <EditeurConditionsExamen valeurs={conditionsExamen} onChange={setConditionsExamen} />
      <div style={{ marginTop: "0.6rem" }}>
        <p style={{ fontSize: "0.9rem", margin: "0 0 0.3rem 0" }}>Signature du contrôleur (matricule/QR + PIN) :</p>
        <SignerQrPin
          documentType={endpoint}
          documentId={jointId}
          versionDocument={procedureRef || "v1"}
          onSigne={setSignatureId}
        />
      </div>
      <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" disabled={enCours || indications.length === 0 || !signatureId}>
          {enCours ? "Enregistrement..." : "Enregistrer le contrôle"}
        </button>
        <button type="button" onClick={onAnnuler}>
          Annuler
        </button>
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.9rem" }}>{erreur}</span>}
      </div>
    </form>
  );
}
