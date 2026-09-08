"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

type Outil = { id: string; reference: string; type: string };

interface MesureFormulaire {
  position: string;
  diametreMm: string;
  epaisseurMm: string;
}

function mesureVide(): MesureFormulaire {
  return { position: "", diametreMm: "", epaisseurMm: "" };
}

// Le résultat n'est jamais saisi directement : il est calculé côté serveur
// à partir des mesures et de la table de tolérances (voir
// src/lib/tolerances.ts — seule "EXEMPLE-DEMO" y est configurée pour
// l'instant, en attendant les vraies valeurs normatives).
export function ControleDimensionnelForm({
  jointId,
  outils,
  onCree,
  onAnnuler,
}: {
  jointId: string;
  outils: Outil[];
  onCree: () => void;
  onAnnuler: () => void;
}) {
  const router = useRouter();
  const [outilId, setOutilId] = useState("");
  const [normeProduit, setNormeProduit] = useState("");
  const [diametreNominalMm, setDiametreNominalMm] = useState("");
  const [epaisseurNominaleMm, setEpaisseurNominaleMm] = useState("");
  const [mesures, setMesures] = useState<MesureFormulaire[]>([mesureVide()]);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function majMesure(index: number, mesure: MesureFormulaire) {
    setMesures((actuelles) => actuelles.map((m, i) => (i === index ? mesure : m)));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/controles-dimensionnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jointId,
        outilId: outilId || undefined,
        normeProduit,
        diametreNominalMm: Number(diametreNominalMm),
        epaisseurNominaleMm: Number(epaisseurNominaleMm),
        mesures: mesures.map((m) => ({
          position: m.position,
          diametreMm: m.diametreMm ? Number(m.diametreMm) : undefined,
          epaisseurMm: m.epaisseurMm ? Number(m.epaisseurMm) : undefined,
        })),
        signatureId: signatureId ?? undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer ce contrôle.");
      return;
    }
    onCree();
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ border: "1px solid #ddd", padding: "0.6rem", marginTop: "0.4rem", maxWidth: 600 }}>
      <label style={{ fontSize: "0.85rem" }}>
        Outil de mesure (optionnel)
        <select value={outilId} onChange={(e) => setOutilId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }}>
          <option value="">— non précisé —</option>
          {outils.map((o) => (
            <option key={o.id} value={o.id}>
              {o.reference} ({o.type})
            </option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Norme produit (ex. "EXEMPLE-DEMO" — seule norme configurée pour l&apos;instant, voir
        src/lib/tolerances.ts)
        <input required type="text" value={normeProduit} onChange={(e) => setNormeProduit(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ fontSize: "0.85rem", flex: 1 }}>
          Diamètre nominal (mm)
          <input required type="number" step="0.1" value={diametreNominalMm} onChange={(e) => setDiametreNominalMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
        </label>
        <label style={{ fontSize: "0.85rem", flex: 1 }}>
          Épaisseur nominale (mm)
          <input required type="number" step="0.1" value={epaisseurNominaleMm} onChange={(e) => setEpaisseurNominaleMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
        </label>
      </div>

      <p style={{ fontSize: "0.85rem", margin: "0.4rem 0 0.2rem 0" }}>Mesures ({mesures.length})</p>
      {mesures.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end", marginBottom: "0.3rem" }}>
          <label style={{ fontSize: "0.8rem", flex: 1 }}>
            Position
            <input required type="text" value={m.position} onChange={(e) => majMesure(i, { ...m, position: e.target.value })} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
          </label>
          <label style={{ fontSize: "0.8rem", flex: 1 }}>
            Diamètre mesuré (mm)
            <input type="number" step="0.01" value={m.diametreMm} onChange={(e) => majMesure(i, { ...m, diametreMm: e.target.value })} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
          </label>
          <label style={{ fontSize: "0.8rem", flex: 1 }}>
            Épaisseur mesurée (mm)
            <input type="number" step="0.01" value={m.epaisseurMm} onChange={(e) => majMesure(i, { ...m, epaisseurMm: e.target.value })} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
          </label>
          <button type="button" onClick={() => setMesures((actuelles) => actuelles.filter((_, idx) => idx !== i))} style={{ fontSize: "0.8rem" }}>
            Retirer
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setMesures((actuelles) => [...actuelles, mesureVide()])}>
        + Ajouter une mesure
      </button>

      <div style={{ marginTop: "0.5rem" }}>
        <p style={{ fontSize: "0.8rem", margin: "0 0 0.2rem 0" }}>Signature du contrôleur (matricule/QR + PIN) :</p>
        <SignerQrPin
          documentType="ControleDimensionnel"
          documentId={jointId}
          versionDocument={normeProduit || "v1"}
          onSigne={setSignatureId}
        />
      </div>
      <div style={{ marginTop: "0.4rem" }}>
        <button type="submit" disabled={enCours || !signatureId}>
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
