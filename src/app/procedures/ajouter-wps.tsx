"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditeurPasse } from "./editeur-passe";
import { passeVide, passeVersJson, type PasseWpsFormulaire } from "./passe-wps";

type Qmos = { id: string; reference: string; version: string };

const LIBELLE_TYPE_ASSEMBLAGE: Record<string, string> = {
  BOUT_A_BOUT: "Bout à bout",
  ANGLE: "Angle",
  EMMANCHE_SOUDE: "Emmanché-soudé",
  RECHARGEMENT: "Rechargement",
  AUTRE: "Autre",
};

export function AjouterWps({ qmosDisponibles }: { qmosDisponibles: Qmos[] }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [version, setVersion] = useState("Rev 0");
  const [typeAssemblage, setTypeAssemblage] = useState("");
  const [procede, setProcede] = useState("");
  const [normeReference, setNormeReference] = useState("");
  const [materiaux, setMateriaux] = useState("");
  const [groupeMateriaux, setGroupeMateriaux] = useState("");
  const [epaisseurMinMm, setEpaisseurMinMm] = useState("");
  const [epaisseurMaxMm, setEpaisseurMaxMm] = useState("");
  const [diametreMinMm, setDiametreMinMm] = useState("");
  const [diametreMaxMm, setDiametreMaxMm] = useState("");
  const [positions, setPositions] = useState("");
  const [preparationNotes, setPreparationNotes] = useState("");
  const [qmosId, setQmosId] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [dateEmission, setDateEmission] = useState("");
  const [tempsTheoriqueMin, setTempsTheoriqueMin] = useState("");
  const [passes, setPasses] = useState<PasseWpsFormulaire[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function ajouterPasse() {
    setPasses((actuelles) => [...actuelles, passeVide(actuelles.length + 1)]);
  }
  function majPasse(index: number, passe: PasseWpsFormulaire) {
    setPasses((actuelles) => actuelles.map((p, i) => (i === index ? passe : p)));
  }
  function supprimerPasse(index: number) {
    setPasses((actuelles) => actuelles.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordre: i + 1 })));
  }

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
        typeAssemblage: typeAssemblage || undefined,
        procede,
        normeReference,
        materiaux: materiaux || undefined,
        groupeMateriaux: groupeMateriaux || undefined,
        epaisseurMinMm: epaisseurMinMm ? Number(epaisseurMinMm) : undefined,
        epaisseurMaxMm: epaisseurMaxMm ? Number(epaisseurMaxMm) : undefined,
        diametreMinMm: diametreMinMm ? Number(diametreMinMm) : undefined,
        diametreMaxMm: diametreMaxMm ? Number(diametreMaxMm) : undefined,
        positions: positions || undefined,
        preparationNotes: preparationNotes || undefined,
        qmosId: qmosId || undefined,
        documentUrl: documentUrl || undefined,
        dateEmission: new Date(dateEmission).toISOString(),
        tempsTheoriqueMin: tempsTheoriqueMin ? Number(tempsTheoriqueMin) : undefined,
        passes: passes.map(passeVersJson),
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de créer ce WPS (référence + version déjà utilisées, ou date manquante ?).");
      return;
    }
    setReference("");
    setVersion("Rev 0");
    setTypeAssemblage("");
    setProcede("");
    setNormeReference("");
    setMateriaux("");
    setGroupeMateriaux("");
    setEpaisseurMinMm("");
    setEpaisseurMaxMm("");
    setDiametreMinMm("");
    setDiametreMaxMm("");
    setPositions("");
    setPreparationNotes("");
    setQmosId("");
    setDocumentUrl("");
    setDateEmission("");
    setTempsTheoriqueMin("");
    setPasses([]);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 700 }}>
      <label>
        Référence (ex. DMOS-001)
        <input required type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Version
        <input required type="text" value={version} onChange={(e) => setVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Type d&apos;assemblage (optionnel)
        <select value={typeAssemblage} onChange={(e) => setTypeAssemblage(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="">— non précisé —</option>
          {Object.entries(LIBELLE_TYPE_ASSEMBLAGE).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
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
        Notes de préparation (talon, jeu, mode de préparation... optionnel)
        <input type="text" value={preparationNotes} onChange={(e) => setPreparationNotes(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
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
      <label>
        Temps théorique de référence (minutes, optionnel — voir "Temps et productivité")
        <input type="number" step="1" value={tempsTheoriqueMin} onChange={(e) => setTempsTheoriqueMin(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div>
        <p style={{ margin: "0.5rem 0 0.3rem 0", fontWeight: "bold" }}>
          Passes ({passes.length}) — ce que le soudeur doit suivre pour chaque passe, dans l&apos;ordre
        </p>
        {passes.map((p, i) => (
          <EditeurPasse key={i} passe={p} onChange={(passe) => majPasse(i, passe)} onSupprimer={() => supprimerPasse(i)} />
        ))}
        <button type="button" onClick={ajouterPasse}>
          + Ajouter une passe
        </button>
      </div>
      <button type="submit" disabled={enCours}>
        {enCours ? "Création..." : "Créer le WPS/DMOS"}
      </button>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
