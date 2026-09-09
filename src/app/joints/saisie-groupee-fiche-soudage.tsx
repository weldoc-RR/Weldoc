"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JointPourLot = {
  id: string;
  numero: string;
  indiceReparation: number;
  affaireId: string;
  dejaSignee: boolean;
};
type Affaire = { id: string; numero: string };

const CHAMPS_NUMERIQUES: { cle: string; label: string }[] = [
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

// Saisie groupée de la fiche technique de suivi de soudage (voir POST
// /api/fiches-soudage/lot) : quand un même soudeur a réalisé plusieurs
// joints avec les mêmes paramètres (même procédé, même tension...) dans
// la même période, remplir ces paramètres une seule fois et les
// appliquer à tous les joints cochés — au lieu de ressaisir 5 fois la
// même chose. Une seule saisie du PIN clôt le lot entier, mais chaque
// joint garde sa propre fiche et sa propre signature, tracées
// individuellement, exactement comme s'il avait été signé à part.
export function SaisieGroupeeFicheSoudage({ affaires, joints }: { affaires: Affaire[]; joints: JointPourLot[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [affaireId, setAffaireId] = useState("");
  const [jointIds, setJointIds] = useState<string[]>([]);
  const [procede, setProcede] = useState("");
  const [valeurs, setValeurs] = useState<Record<string, string>>(
    Object.fromEntries(CHAMPS_NUMERIQUES.map((c) => [c.cle, ""]))
  );
  const [observations, setObservations] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ jointId: string; ok: boolean; erreur?: string }[] | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Saisie groupée (fiche technique de soudage)
      </button>
    );
  }

  const jointsDeLAffaire = joints.filter((j) => j.affaireId === affaireId && !j.dejaSignee);
  const numeroJoint = (j: JointPourLot) => (j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero);

  function cocher(id: string, coche: boolean) {
    setJointIds((liste) => (coche ? [...liste, id] : liste.filter((i) => i !== id)));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);
    setEnCours(true);
    const corps: Record<string, unknown> = {
      jointIds,
      procede: procede || undefined,
      observations: observations || undefined,
      identifiant,
      pin,
    };
    for (const c of CHAMPS_NUMERIQUES) {
      corps[c.cle] = valeurs[c.cle] ? Number(valeurs[c.cle]) : undefined;
    }

    const res = await fetch("/api/fiches-soudage/lot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    setEnCours(false);
    if (!res.ok) {
      const corpsErr = await res.json().catch(() => null);
      setErreur(corpsErr?.error ?? "Impossible d'enregistrer ce lot.");
      return;
    }
    const donnees = await res.json();
    setResultat(donnees.resultats);
    setPin("");
    if ((donnees.resultats as { ok: boolean }[]).every((r) => r.ok)) {
      setJointIds([]);
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={enregistrer}
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 620, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}
    >
      <p style={{ fontSize: "0.75rem", color: "#898781", margin: 0 }}>
        Remplissez les paramètres une fois, cochez les joints concernés, signez une seule fois : chaque joint garde sa
        propre fiche et sa propre signature.
      </p>
      <label>
        Affaire
        <select
          required
          value={affaireId}
          onChange={(e) => {
            setAffaireId(e.target.value);
            setJointIds([]);
          }}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        >
          <option value="">— choisir —</option>
          {affaires.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero}
            </option>
          ))}
        </select>
      </label>

      {affaireId && (
        <div style={{ fontSize: "0.85rem" }}>
          Joints (fiche pas encore signée uniquement) :
          {jointsDeLAffaire.length === 0 ? (
            <p style={{ color: "#898781" }}>Aucun joint disponible pour cette affaire.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.3rem" }}>
              {jointsDeLAffaire.map((j) => (
                <label key={j.id} style={{ border: "1px solid #ddd", padding: "0.2rem 0.5rem", borderRadius: 4 }}>
                  <input
                    type="checkbox"
                    checked={jointIds.includes(j.id)}
                    onChange={(e) => cocher(j.id, e.target.checked)}
                  />{" "}
                  {numeroJoint(j)}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <label style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>
        Procédé
        <input type="text" value={procede} onChange={(e) => setProcede(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
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
      <label style={{ fontSize: "0.85rem" }}>
        Observations (interruptions, reprises...)
        <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.3rem", fontFamily: "inherit" }} />
      </label>

      <p style={{ fontSize: "0.8rem", margin: "0.4rem 0 0 0" }}>
        Signer pour clore les {jointIds.length || ""} fiche(s) sélectionnée(s) (matricule/QR + PIN) :
      </p>
      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          required
          type="text"
          placeholder="Matricule ou QR"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          style={{ width: 150, fontSize: "0.85rem", padding: "0.3rem" }}
        />
        <input
          required
          type="password"
          placeholder="Code PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ width: 100, fontSize: "0.85rem", padding: "0.3rem" }}
        />
        <button type="submit" disabled={enCours || jointIds.length === 0}>
          {enCours ? "Signature..." : `Signer les ${jointIds.length} fiche(s)`}
        </button>
        <button type="button" onClick={() => setOuvert(false)}>
          Fermer
        </button>
      </div>
      {erreur && <p style={{ color: "crimson", fontSize: "0.85rem" }}>{erreur}</p>}
      {resultat && (
        <ul style={{ fontSize: "0.85rem", margin: 0 }}>
          {resultat.map((r) => {
            const j = joints.find((jj) => jj.id === r.jointId);
            return (
              <li key={r.jointId} style={{ color: r.ok ? "#0ca30c" : "crimson" }}>
                {j ? numeroJoint(j) : r.jointId} — {r.ok ? "signée" : r.erreur}
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
