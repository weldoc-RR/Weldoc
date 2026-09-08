"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Qmos = { id: string; reference: string; version: string };

export function AjouterWps({ qmosDisponibles }: { qmosDisponibles: Qmos[] }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [version, setVersion] = useState("Rev 0");
  const [procede, setProcede] = useState("");
  const [normeReference, setNormeReference] = useState("");
  const [materiaux, setMateriaux] = useState("");
  const [groupeMateriaux, setGroupeMateriaux] = useState("");
  const [epaisseurMinMm, setEpaisseurMinMm] = useState("");
  const [epaisseurMaxMm, setEpaisseurMaxMm] = useState("");
  const [diametreMinMm, setDiametreMinMm] = useState("");
  const [diametreMaxMm, setDiametreMaxMm] = useState("");
  const [positions, setPositions] = useState("");
  const [qmosId, setQmosId] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [dateEmission, setDateEmission] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/wps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        version,
        procede,
        normeReference,
        materiaux: materiaux || undefined,
        groupeMateriaux: groupeMateriaux || undefined,
        epaisseurMinMm: epaisseurMinMm ? Number(epaisseurMinMm) : undefined,
        epaisseurMaxMm: epaisseurMaxMm ? Number(epaisseurMaxMm) : undefined,
        diametreMinMm: diametreMinMm ? Number(diametreMinMm) : undefined,
        diametreMaxMm: diametreMaxMm ? Number(diametreMaxMm) : undefined,
        positions: positions || undefined,
        qmosId: qmosId || undefined,
        documentUrl: documentUrl || undefined,
        dateEmission: new Date(dateEmission).toISOString(),
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de créer ce WPS (référence + version déjà utilisées, ou date manquante ?).");
      return;
    }
    setReference("");
    setVersion("Rev 0");
    setProcede("");
    setNormeReference("");
    setMateriaux("");
    setGroupeMateriaux("");
    setEpaisseurMinMm("");
    setEpaisseurMaxMm("");
    setDiametreMinMm("");
    setDiametreMaxMm("");
    setPositions("");
    setQmosId("");
    setDocumentUrl("");
    setDateEmission("");
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480 }}>
      <label>
        Référence (ex. DMOS-001)
        <input required type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Version
        <input required type="text" value={version} onChange={(e) => setVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Procédé (ex. 141 / TIG)
        <input required type="text" value={procede} onChange={(e) => setProcede(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Norme de référence (ex. EN ISO 15609)
        <input required type="text" value={normeReference} onChange={(e) => setNormeReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Matériaux couverts (optionnel)
        <input type="text" value={materiaux} onChange={(e) => setMateriaux(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Groupe de matériaux (ex. ISO/TR 15608 — sert au rapprochement avec les qualifications, optionnel)
        <input type="text" value={groupeMateriaux} onChange={(e) => setGroupeMateriaux(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <label style={{ flex: 1 }}>
          Épaisseur min (mm)
          <input type="number" step="0.1" value={epaisseurMinMm} onChange={(e) => setEpaisseurMinMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Épaisseur max (mm)
          <input type="number" step="0.1" value={epaisseurMaxMm} onChange={(e) => setEpaisseurMaxMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <label style={{ flex: 1 }}>
          Diamètre min (mm)
          <input type="number" step="0.1" value={diametreMinMm} onChange={(e) => setDiametreMinMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Diamètre max (mm)
          <input type="number" step="0.1" value={diametreMaxMm} onChange={(e) => setDiametreMaxMm(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <label>
        Positions de soudage (optionnel)
        <input type="text" value={positions} onChange={(e) => setPositions(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        QMOS justifiant ce WPS (optionnel)
        <select value={qmosId} onChange={(e) => setQmosId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="">— non précisée —</option>
          {qmosDisponibles.map((q) => (
            <option key={q.id} value={q.id}>
              {q.reference} ({q.version})
            </option>
          ))}
        </select>
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
        {enCours ? "Création..." : "Créer le WPS/DMOS"}
      </button>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
