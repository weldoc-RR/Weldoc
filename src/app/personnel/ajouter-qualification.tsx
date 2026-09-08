"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Personnel = { id: string; nom: string; prenom: string };
type Referentiel = { id: string; code: string; domaine: string };

const TYPES_ASSEMBLAGE_COURANTS = ["BW", "FW", "SW"];

export function AjouterQualification({ personnel, referentiels }: { personnel: Personnel[]; referentiels: Referentiel[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [norme, setNorme] = useState("");
  const [referentielId, setReferentielId] = useState("");
  const [organismeExamen, setOrganismeExamen] = useState("");
  const [procede, setProcede] = useState("");
  const [codeQualification, setCodeQualification] = useState("");
  const [groupeMateriaux, setGroupeMateriaux] = useState("");
  const [positionSoudage, setPositionSoudage] = useState("");
  const [epaisseurMinMm, setEpaisseurMinMm] = useState("");
  const [epaisseurMaxMm, setEpaisseurMaxMm] = useState("");
  const [diametreMinMm, setDiametreMinMm] = useState("");
  const [diametreMaxMm, setDiametreMaxMm] = useState("");
  const [dateObtention, setDateObtention] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [frequenceConfirmationMois, setFrequenceConfirmationMois] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Enregistrer une qualification soudage
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/qualifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId,
        type: "SOUDAGE",
        reference,
        norme,
        referentielId: referentielId || undefined,
        organismeExamen: organismeExamen || undefined,
        procede: procede || undefined,
        codeQualification: codeQualification || undefined,
        groupeMateriaux: groupeMateriaux || undefined,
        positionSoudage: positionSoudage || undefined,
        epaisseurMinMm: epaisseurMinMm ? Number(epaisseurMinMm) : undefined,
        epaisseurMaxMm: epaisseurMaxMm ? Number(epaisseurMaxMm) : undefined,
        diametreMinMm: diametreMinMm ? Number(diametreMinMm) : undefined,
        diametreMaxMm: diametreMaxMm ? Number(diametreMaxMm) : undefined,
        dateObtention: new Date(dateObtention).toISOString(),
        dateExpiration: dateExpiration ? new Date(dateExpiration).toISOString() : undefined,
        frequenceConfirmationMois: frequenceConfirmationMois ? Number(frequenceConfirmationMois) : undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette qualification.");
      return;
    }
    setReference("");
    setNorme("");
    setOrganismeExamen("");
    setProcede("");
    setCodeQualification("");
    setGroupeMateriaux("");
    setPositionSoudage("");
    setEpaisseurMinMm("");
    setEpaisseurMaxMm("");
    setDiametreMinMm("");
    setDiametreMaxMm("");
    setDateObtention("");
    setDateExpiration("");
    setFrequenceConfirmationMois("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Personne
        <select value={personnelId} onChange={(e) => setPersonnelId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          {personnel.map((p) => (
            <option key={p.id} value={p.id}>
              {p.prenom} {p.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        Référence du certificat
        <input required type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Norme (ex. EN ISO 9606-1)
        <input required type="text" value={norme} onChange={(e) => setNorme(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      {referentiels.length > 0 && (
        <label>
          Référentiel (optionnel)
          <select value={referentielId} onChange={(e) => setReferentielId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
            <option value="">— non précisé —</option>
            {referentiels.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} ({r.domaine})
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Organisme (ou personne) ayant examiné/délivré la qualification (optionnel)
        <input type="text" value={organismeExamen} onChange={(e) => setOrganismeExamen(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Procédé (ex. 141 / TIG, optionnel)
        <input type="text" value={procede} onChange={(e) => setProcede(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Type de qualification (ex. BW-A1, FW-I2... — selon votre référentiel, optionnel)
        <input
          list="types-assemblage-courants"
          type="text"
          value={codeQualification}
          onChange={(e) => setCodeQualification(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        />
        <datalist id="types-assemblage-courants">
          {TYPES_ASSEMBLAGE_COURANTS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <label>
        Groupe de matériaux (ex. ISO/TR 15608, optionnel)
        <input type="text" value={groupeMateriaux} onChange={(e) => setGroupeMateriaux(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Position de soudage (optionnel)
        <input type="text" value={positionSoudage} onChange={(e) => setPositionSoudage(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
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
        Date d&apos;obtention
        <input required type="date" value={dateObtention} onChange={(e) => setDateObtention(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date d&apos;expiration (optionnel)
        <input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Confirmation de validité exigée tous les combien de mois (optionnel, ex. 6 — laisser vide si le référentiel
        n&apos;en exige pas)
        <input
          type="number"
          min="1"
          step="1"
          value={frequenceConfirmationMois}
          onChange={(e) => setFrequenceConfirmationMois(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
