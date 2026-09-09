"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";

type Affaire = { id: string; numero: string };

// Réception d'une matière (CCPU) — voir POST /api/matieres. Saisie une
// seule fois puis réutilisée sur chaque joint qui l'emploie (Joint.matiereId),
// jamais ressaisie. Le champ "norme produit" doit reprendre exactement
// l'intitulé reconnu par le moteur de tolérances (voir
// src/lib/tolerances.ts) pour que les critères dimensionnels applicables
// se déterminent automatiquement au contrôle, sans ressaisie non plus.
const NORMES_RECONNUES = ["EN 10216-2 (T nominale)", "EN 10216-2 (Tmin)", "EN 10216-2 (fini à froid)"];

export function AjouterMatiere({ affaires }: { affaires: Affaire[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [affaireId, setAffaireId] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [designation, setDesignation] = useState("");
  const [reference, setReference] = useState("");
  const [normeProduit, setNormeProduit] = useState("");
  const [nuance, setNuance] = useState("");
  const [diametre, setDiametre] = useState("");
  const [epaisseur, setEpaisseur] = useState("");
  const [finition, setFinition] = useState("");
  const [etat, setEtat] = useState("");
  const [numeroCoulee, setNumeroCoulee] = useState("");
  const [numeroLot, setNumeroLot] = useState("");
  const [ccpuDocumentUrl, setCcpuDocumentUrl] = useState("");
  const [certificatUrl, setCertificatUrl] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Réceptionner une matière (CCPU)
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/matieres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        fournisseur,
        designation,
        reference: reference || undefined,
        normeProduit,
        nuance,
        diametre: diametre ? Number(diametre) : undefined,
        epaisseur: epaisseur ? Number(epaisseur) : undefined,
        finition: finition || undefined,
        etat: etat || undefined,
        numeroCoulee,
        numeroLot: numeroLot || undefined,
        ccpuDocumentUrl: ccpuDocumentUrl || undefined,
        certificatUrl: certificatUrl || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette matière.");
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Affaire
        <select required value={affaireId} onChange={(e) => setAffaireId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="">— choisir —</option>
          {affaires.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero}
            </option>
          ))}
        </select>
      </label>
      <label>
        Fournisseur
        <input required type="text" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Désignation (ex. Tube acier carbone)
        <input required type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Référence (optionnel)
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Norme produit
        <input
          required
          list="normes-reconnues"
          type="text"
          value={normeProduit}
          onChange={(e) => setNormeProduit(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        />
        <datalist id="normes-reconnues">
          {NORMES_RECONNUES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <p style={{ fontSize: "0.75rem", color: "#898781", margin: "-0.3rem 0 0 0" }}>
        Reprendre exactement un des intitulés proposés ({NORMES_RECONNUES.join(" · ")}) pour que les critères
        dimensionnels de la bibliothèque de tolérances se déterminent automatiquement au contrôle. Toute autre
        valeur reste possible mais devra être renseignée à la main au contrôle.
      </p>
      <label>
        Nuance
        <input required type="text" value={nuance} onChange={(e) => setNuance(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Diamètre nominal (mm, optionnel)
          <input type="number" step="0.1" value={diametre} onChange={(e) => setDiametre(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Épaisseur nominale (mm, optionnel — ou Tmin selon la norme choisie)
          <input type="number" step="0.1" value={epaisseur} onChange={(e) => setEpaisseur(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Finition (optionnel)
          <input type="text" value={finition} onChange={(e) => setFinition(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          État (optionnel)
          <input type="text" value={etat} onChange={(e) => setEtat(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <label>
        Numéro de coulée
        <input required type="text" value={numeroCoulee} onChange={(e) => setNumeroCoulee(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Numéro de lot (optionnel)
        <input type="text" value={numeroLot} onChange={(e) => setNumeroLot(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le CCPU (optionnel)
        <input type="text" value={ccpuDocumentUrl} onChange={(e) => setCcpuDocumentUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <FileUpload onDepose={setCcpuDocumentUrl} />
      <label>
        Lien vers le certificat (optionnel)
        <input type="text" value={certificatUrl} onChange={(e) => setCertificatUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <FileUpload onDepose={setCertificatUrl} />
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer la matière"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
