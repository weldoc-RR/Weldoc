"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

type Outil = { id: string; reference: string; type: string };
type ProduitDimensionnel = {
  id: string;
  reference: string;
  version: string;
  designation: string;
  normeProduit: string;
  diametreNominalMm: number | null;
  epaisseurNominaleMm: number | null;
};

interface MesureFormulaire {
  position: string;
  diametreMm: string;
  epaisseurMm: string;
}

function mesureVide(): MesureFormulaire {
  return { position: "", diametreMm: "", epaisseurMm: "" };
}

type MatiereJoint = { normeProduit: string; diametre: number | null; epaisseur: number | null } | null;

// Le résultat n'est jamais saisi directement : il est calculé côté serveur
// à partir des mesures et des critères applicables (voir
// src/lib/tolerances.ts pour les normes déjà configurées, ou un produit de
// la bibliothèque dimensionnelle). Norme/diamètre/épaisseur se préremplissent
// automatiquement depuis la matière (CCPU) du joint quand il y en a une —
// une donnée saisie une seule fois à la réception, jamais reressaisie ici.
export function ControleDimensionnelForm({
  jointId,
  outils,
  produitsDimensionnels,
  matiere,
  onCree,
  onAnnuler,
}: {
  jointId: string;
  outils: Outil[];
  produitsDimensionnels: ProduitDimensionnel[];
  matiere: MatiereJoint;
  onCree: () => void;
  onAnnuler: () => void;
}) {
  const router = useRouter();
  const [outilId, setOutilId] = useState("");
  const [produitDimensionnelId, setProduitDimensionnelId] = useState("");
  const [normeProduit, setNormeProduit] = useState(() => matiere?.normeProduit ?? "");
  const [diametreNominalMm, setDiametreNominalMm] = useState(() => (matiere?.diametre != null ? String(matiere.diametre) : ""));
  const [epaisseurNominaleMm, setEpaisseurNominaleMm] = useState(() => (matiere?.epaisseur != null ? String(matiere.epaisseur) : ""));

  function choisirProduit(id: string) {
    setProduitDimensionnelId(id);
    const produit = produitsDimensionnels.find((p) => p.id === id);
    if (produit) {
      setNormeProduit(produit.normeProduit);
      if (produit.diametreNominalMm !== null) setDiametreNominalMm(String(produit.diametreNominalMm));
      if (produit.epaisseurNominaleMm !== null) setEpaisseurNominaleMm(String(produit.epaisseurNominaleMm));
    }
  }
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
        produitDimensionnelId: produitDimensionnelId || undefined,
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
    <form onSubmit={enregistrer} style={{ border: "1px solid var(--couleur-bordure)", borderRadius: 6, padding: "1rem", marginTop: "0.5rem", maxWidth: 660 }}>
      <label style={{ fontSize: "0.95rem", display: "block" }}>
        Outil de mesure (optionnel)
        <select value={outilId} onChange={(e) => setOutilId(e.target.value)} style={{ display: "block", width: "100%" }}>
          <option value="">— non précisé —</option>
          {outils.map((o) => (
            <option key={o.id} value={o.id}>
              {o.reference} ({o.type})
            </option>
          ))}
        </select>
      </label>
      {matiere && (
        <p style={{ fontSize: "0.9rem", color: "#0ca30c", margin: "0.4rem 0 0 0" }}>
          Norme, diamètre et épaisseur préremplis depuis la matière (CCPU) de ce joint — modifiables si besoin.
        </p>
      )}
      {produitsDimensionnels.length > 0 && (
        <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
          Produit de la bibliothèque dimensionnelle (optionnel — remplit et fait foi pour les critères)
          <select value={produitDimensionnelId} onChange={(e) => choisirProduit(e.target.value)} style={{ display: "block", width: "100%" }}>
            <option value="">— aucun, saisie manuelle —</option>
            {produitsDimensionnels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.reference} ({p.version}) — {p.designation}
              </option>
            ))}
          </select>
        </label>
      )}
      <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
        Norme produit
        {!produitDimensionnelId && ' (ex. "EN 10216-2 (T nominale)", "EXEMPLE-DEMO"... — voir src/lib/tolerances.ts pour les normes reconnues)'}
        <input
          required
          type="text"
          value={normeProduit}
          onChange={(e) => setNormeProduit(e.target.value)}
          readOnly={Boolean(produitDimensionnelId)}
          style={{ display: "block", width: "100%", background: produitDimensionnelId ? "#f2f1ec" : undefined }}
        />
      </label>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
        <label style={{ fontSize: "0.95rem", flex: 1, minWidth: 180 }}>
          Diamètre nominal (mm)
          <input required type="number" step="0.1" value={diametreNominalMm} onChange={(e) => setDiametreNominalMm(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
        <label style={{ fontSize: "0.95rem", flex: 1, minWidth: 180 }}>
          Épaisseur nominale (mm)
          <input required type="number" step="0.1" value={epaisseurNominaleMm} onChange={(e) => setEpaisseurNominaleMm(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
      </div>

      <p style={{ fontSize: "0.9rem", margin: "0.6rem 0 0.3rem 0" }}>Mesures ({mesures.length})</p>
      {mesures.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "0.5rem" }}>
          <label style={{ fontSize: "0.9rem", flex: 1, minWidth: 140 }}>
            Position
            <input required type="text" value={m.position} onChange={(e) => majMesure(i, { ...m, position: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>
          <label style={{ fontSize: "0.9rem", flex: 1, minWidth: 140 }}>
            Diamètre mesuré (mm)
            <input type="number" step="0.01" value={m.diametreMm} onChange={(e) => majMesure(i, { ...m, diametreMm: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>
          <label style={{ fontSize: "0.9rem", flex: 1, minWidth: 140 }}>
            Épaisseur mesurée (mm)
            <input type="number" step="0.01" value={m.epaisseurMm} onChange={(e) => majMesure(i, { ...m, epaisseurMm: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>
          <button type="button" onClick={() => setMesures((actuelles) => actuelles.filter((_, idx) => idx !== i))}>
            Retirer
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setMesures((actuelles) => [...actuelles, mesureVide()])}>
        + Ajouter une mesure
      </button>

      <div style={{ marginTop: "0.6rem" }}>
        <p style={{ fontSize: "0.9rem", margin: "0 0 0.3rem 0" }}>Signature du contrôleur (matricule/QR + PIN) :</p>
        <SignerQrPin
          documentType="ControleDimensionnel"
          documentId={jointId}
          versionDocument={normeProduit || "v1"}
          onSigne={setSignatureId}
        />
      </div>
      <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" disabled={enCours || !signatureId}>
          {enCours ? "Enregistrement..." : "Enregistrer le contrôle"}
        </button>
        <button type="button" onClick={onAnnuler}>
          Annuler
        </button>
        {erreur && <span style={{ color: "crimson", fontSize: "0.9rem" }}>{erreur}</span>}
      </div>
    </form>
  );
}
