"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

export type FicheSoudage = {
  procede: string | null;
  preechauffageC: number | null;
  temperatureInterpasses: number | null;
  postchauffageC: number | null;
  tensionV: number | null;
  intensiteA: number | null;
  vitesseMmMin: number | null;
  energieKJMm: number | null;
  nombrePasses: number | null;
  tempsMin: number | null;
  observations: string | null;
  signatureId: string | null;
} | null;

const CHAMPS_NUMERIQUES: { cle: keyof NonNullable<FicheSoudage>; label: string }[] = [
  { cle: "preechauffageC", label: "Préchauffage (°C)" },
  { cle: "temperatureInterpasses", label: "Température interpasses (°C)" },
  { cle: "postchauffageC", label: "Postchauffage (°C)" },
  { cle: "tensionV", label: "Tension (V)" },
  { cle: "intensiteA", label: "Intensité (A)" },
  { cle: "vitesseMmMin", label: "Vitesse (mm/min)" },
  { cle: "energieKJMm", label: "Énergie (kJ/mm)" },
  { cle: "nombrePasses", label: "Nombre de passes" },
  { cle: "tempsMin", label: "Temps (min)" },
];

// Fiche de suivi de soudage (voir cahier des charges, un exemple réel
// n'ayant pas encore été fourni pour finaliser tous les champs) :
// identification déjà connue via Joint (soudeur/QS/WPS/QMOS/consommable),
// jamais redemandée ici. Modifiable tant qu'elle n'est pas signée
// (PATCH /api/joints/[id]/fiche-soudage) ; une fois signée, affichage
// seul.
export function FicheSoudageForm({ jointId, fiche, onFermer }: { jointId: string; fiche: FicheSoudage; onFermer: () => void }) {
  const router = useRouter();
  const [procede, setProcede] = useState(fiche?.procede ?? "");
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(CHAMPS_NUMERIQUES.map((c) => [c.cle, fiche?.[c.cle]?.toString() ?? ""]))
  );
  const [observations, setObservations] = useState(fiche?.observations ?? "");
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const dejaSignee = Boolean(fiche?.signatureId);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const corps: Record<string, unknown> = { procede: procede || undefined, observations: observations || undefined };
    for (const c of CHAMPS_NUMERIQUES) {
      corps[c.cle] = valeurs[c.cle] ? Number(valeurs[c.cle]) : undefined;
    }
    if (signatureId) corps.signatureId = signatureId;

    const res = await fetch(`/api/joints/${jointId}/fiche-soudage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    setEnCours(false);
    if (!res.ok) {
      const corpsErr = await res.json().catch(() => null);
      setErreur(corpsErr?.error ?? "Impossible d'enregistrer.");
      return;
    }
    router.refresh();
    if (signatureId) onFermer();
  }

  if (dejaSignee) {
    return (
      <div style={{ border: "1px solid #ddd", padding: "0.6rem", marginTop: "0.4rem", maxWidth: 600 }}>
        <p style={{ color: "#0ca30c", fontSize: "0.85rem" }}>✓ Fiche de suivi de soudage signée (lecture seule).</p>
        <p style={{ fontSize: "0.85rem" }}>
          Procédé : {fiche?.procede ?? "—"} · Préchauffage : {fiche?.preechauffageC ?? "—"}°C · Postchauffage :{" "}
          {fiche?.postchauffageC ?? "—"}°C · Passes : {fiche?.nombrePasses ?? "—"}
        </p>
        {fiche?.observations && <p style={{ fontSize: "0.85rem" }}>{fiche.observations}</p>}
        <button type="button" onClick={onFermer}>
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enregistrer} style={{ border: "1px solid #ddd", padding: "0.6rem", marginTop: "0.4rem", maxWidth: 600 }}>
      <label style={{ fontSize: "0.85rem" }}>
        Procédé
        <input type="text" value={procede} onChange={(e) => setProcede(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.4rem" }}>
        {CHAMPS_NUMERIQUES.map((c) => (
          <label key={c.cle} style={{ fontSize: "0.8rem" }}>
            {c.label}
            <input
              type="number"
              step="0.01"
              value={valeurs[c.cle]}
              onChange={(e) => setValeurs((v) => ({ ...v, [c.cle]: e.target.value }))}
              style={{ display: "block", width: "100%", padding: "0.3rem" }}
            />
          </label>
        ))}
      </div>
      <label style={{ fontSize: "0.85rem", display: "block", marginTop: "0.4rem" }}>
        Observations (interruptions, reprises...)
        <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.3rem", fontFamily: "inherit" }} />
      </label>

      <div style={{ marginTop: "0.5rem" }}>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer (sans signer)"}
        </button>
        <button type="button" onClick={onFermer} style={{ marginLeft: "0.4rem" }}>
          Fermer
        </button>
        {erreur && <span style={{ color: "crimson", fontSize: "0.85rem", marginLeft: "0.4rem" }}>{erreur}</span>}
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        <p style={{ fontSize: "0.8rem", margin: "0 0 0.2rem 0" }}>
          Signer pour clore la fiche (matricule/QR + PIN) — plus aucune modification possible ensuite :
        </p>
        {signatureId ? (
          <button type="submit" disabled={enCours}>
            {enCours ? "..." : "Confirmer et signer"}
          </button>
        ) : (
          <SignerQrPin
            documentType="FICHE_TECHNIQUE_SOUDAGE"
            documentId={jointId}
            versionDocument={procede || "v1"}
            onSigne={setSignatureId}
          />
        )}
      </div>
    </form>
  );
}
