"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";
import { IsoCanvas, type IsoTrait } from "./iso-canvas";

export type Tqc = {
  localisation: string | null;
  equipement: string | null;
  support: string | null;
  ecarts: string | null;
  observations: string | null;
  isoFondUrl: string | null;
  isoTraits: unknown;
  signatureId: string | null;
} | null;

function traitsDepuis(isoTraits: unknown): IsoTrait[] {
  return Array.isArray(isoTraits) ? (isoTraits as IsoTrait[]) : [];
}

// TQC ("tel que construit", voir le cahier des charges) : localisation,
// équipement/support, écarts et observations par rapport au prévu. Les
// dimensions mesurées et les photos ne sont pas ressaisies ici — elles
// restent sur le contrôle dimensionnel et le book photo du joint (déjà
// consultables ci-dessus/sur la page book photo de l'affaire). Modifiable
// tant que non signé (PATCH /api/joints/[id]/tqc) ; une fois signé,
// affichage seul.
export function TqcForm({ jointId, tqc, onFermer }: { jointId: string; tqc: Tqc; onFermer: () => void }) {
  const router = useRouter();
  const [localisation, setLocalisation] = useState(tqc?.localisation ?? "");
  const [equipement, setEquipement] = useState(tqc?.equipement ?? "");
  const [support, setSupport] = useState(tqc?.support ?? "");
  const [ecarts, setEcarts] = useState(tqc?.ecarts ?? "");
  const [observations, setObservations] = useState(tqc?.observations ?? "");
  const [isoFondUrl, setIsoFondUrl] = useState(tqc?.isoFondUrl ?? "");
  const [isoTraits, setIsoTraits] = useState<IsoTrait[]>(traitsDepuis(tqc?.isoTraits));
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const dejaSigne = Boolean(tqc?.signatureId);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const corps: Record<string, unknown> = {
      localisation: localisation || undefined,
      equipement: equipement || undefined,
      support: support || undefined,
      ecarts: ecarts || undefined,
      observations: observations || undefined,
      isoFondUrl: isoFondUrl || undefined,
      isoTraits: isoTraits.length > 0 ? isoTraits : undefined,
    };
    if (signatureId) corps.signatureId = signatureId;

    const res = await fetch(`/api/joints/${jointId}/tqc`, {
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

  if (dejaSigne) {
    return (
      <div style={{ border: "1px solid var(--couleur-bordure)", padding: "0.6rem", marginTop: "0.4rem", maxWidth: 600 }}>
        <p style={{ color: "var(--couleur-conforme)", fontSize: "0.85rem" }}>✓ TQC signé (lecture seule).</p>
        <p style={{ fontSize: "0.85rem" }}>
          Localisation : {tqc?.localisation ?? "—"} · Équipement : {tqc?.equipement ?? "—"} · Support :{" "}
          {tqc?.support ?? "—"}
        </p>
        {tqc?.ecarts && <p style={{ fontSize: "0.85rem" }}>Écarts : {tqc.ecarts}</p>}
        {tqc?.observations && <p style={{ fontSize: "0.85rem" }}>{tqc.observations}</p>}
        {(tqc?.isoFondUrl || isoTraits.length > 0) && (
          <div style={{ marginTop: "0.4rem" }}>
            <p style={{ fontSize: "0.8rem", margin: "0 0 0.2rem 0" }}>ISO manuel :</p>
            <IsoCanvas fondUrl={tqc?.isoFondUrl ?? null} traits={isoTraits} />
          </div>
        )}
        <button type="button" onClick={onFermer}>
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enregistrer} style={{ border: "1px solid var(--couleur-bordure)", borderRadius: 6, padding: "1rem", marginTop: "0.5rem", maxWidth: 660 }}>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", margin: "0 0 0.4rem 0" }}>
        Dimensions mesurées et photos : voir le contrôle dimensionnel et le book photo de ce joint, déjà saisis
        ailleurs — pas de nouvelle saisie ici.
      </p>
      <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.5rem" }}>
        Localisation
        <input type="text" value={localisation} onChange={(e) => setLocalisation(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.6rem" }}>
        <label style={{ fontSize: "0.95rem" }}>
          Équipement
          <input type="text" value={equipement} onChange={(e) => setEquipement(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
        <label style={{ fontSize: "0.95rem" }}>
          Support
          <input type="text" value={support} onChange={(e) => setSupport(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
      </div>
      <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
        Écarts par rapport au prévu
        <textarea value={ecarts} onChange={(e) => setEcarts(e.target.value)} rows={3} style={{ display: "block", width: "100%", padding: "0.5rem", fontFamily: "inherit", fontSize: "1rem" }} />
      </label>
      <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
        Observations
        <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} style={{ display: "block", width: "100%", padding: "0.5rem", fontFamily: "inherit", fontSize: "1rem" }} />
      </label>

      <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
        ISO manuel — fond à annoter (optionnel, lien vers un schéma iso déjà hébergé)
        <input type="text" value={isoFondUrl} onChange={(e) => setIsoFondUrl(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      <p style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)", margin: "0.3rem 0 0.2rem 0" }}>
        Dessinez au stylet, au doigt ou à la souris directement sur le schéma (ou sur fond blanc si aucun lien
        renseigné) — le résultat est enregistré avec le reste du TQC.
      </p>
      <IsoCanvas fondUrl={isoFondUrl || null} traits={isoTraits} onChange={setIsoTraits} />

      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer (sans signer)"}
        </button>
        <button type="button" onClick={onFermer}>
          Fermer
        </button>
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.9rem" }}>{erreur}</span>}
      </div>

      <div style={{ marginTop: "0.75rem" }}>
        <p style={{ fontSize: "0.9rem", margin: "0 0 0.4rem 0" }}>
          Signer pour clore le TQC (matricule/QR + PIN) — plus aucune modification possible ensuite :
        </p>
        {signatureId ? (
          <button type="submit" disabled={enCours}>
            {enCours ? "..." : "Confirmer et signer"}
          </button>
        ) : (
          <SignerQrPin documentType="TQC" documentId={jointId} versionDocument="v1" onSigne={setSignatureId} />
        )}
      </div>
    </form>
  );
}
