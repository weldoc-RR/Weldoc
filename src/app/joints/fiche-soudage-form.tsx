"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

export type FicheSoudage = {
  id: string;
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
  joints: { id: string; numero: string; indiceReparation: number }[];
} | null;

type JointCandidat = { id: string; numero: string; indiceReparation: number };

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

function numeroAffiche(j: JointCandidat) {
  return j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero;
}

// Fiche de suivi de soudage (voir cahier des charges, un exemple réel
// n'ayant pas encore été fourni pour finaliser tous les champs) :
// identification déjà connue via Joint (soudeur/QS/WPS/QMOS/consommable),
// jamais redemandée ici. Une même fiche peut couvrir plusieurs joints à
// la fois ("saisie groupée", voir POST/PATCH /api/fiches-soudage) quand
// le même soudeur a réalisé plusieurs soudures avec les mêmes
// paramètres : les autres joints de l'affaire pas encore couverts sont
// proposés en cases à cocher. Modifiable tant que la fiche n'est pas
// signée ; une fois signée (QR/matricule + PIN, une seule fois pour tous
// les joints couverts), plus aucune modification n'est acceptée.
export function FicheSoudageForm({
  jointId,
  jointNumero,
  fiche,
  autresJoints,
  onFermer,
}: {
  jointId: string;
  jointNumero: string;
  fiche: FicheSoudage;
  autresJoints: JointCandidat[];
  onFermer: () => void;
}) {
  const router = useRouter();
  const [ficheId, setFicheId] = useState<string | null>(fiche?.id ?? null);
  const [jointIds, setJointIds] = useState<string[]>(fiche ? fiche.joints.map((j) => j.id) : [jointId]);
  const [procede, setProcede] = useState(fiche?.procede ?? "");
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(CHAMPS_NUMERIQUES.map((c) => [c.cle, fiche?.[c.cle]?.toString() ?? ""]))
  );
  const [observations, setObservations] = useState(fiche?.observations ?? "");
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const dejaSignee = Boolean(fiche?.signatureId);

  // Cases à cocher : ce joint (toujours en tête), les autres joints déjà
  // couverts par cette fiche (pour pouvoir les décocher), et les autres
  // joints de l'affaire sans fiche (candidats à ajouter au lot).
  const candidats: JointCandidat[] = [
    { id: jointId, numero: jointNumero, indiceReparation: 0 },
    ...(fiche?.joints.filter((j) => j.id !== jointId) ?? []),
    ...autresJoints,
  ].filter((j, i, arr) => arr.findIndex((jj) => jj.id === j.id) === i);
  const libelleJoint = (c: JointCandidat) => (c.id === jointId ? jointNumero : numeroAffiche(c));

  function cocher(id: string, coche: boolean) {
    setJointIds((liste) => (coche ? [...liste, id] : liste.filter((i) => i !== id)));
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const corps: Record<string, unknown> = {
      procede: procede || undefined,
      observations: observations || undefined,
      jointIds,
    };
    for (const c of CHAMPS_NUMERIQUES) {
      corps[c.cle] = valeurs[c.cle] ? Number(valeurs[c.cle]) : undefined;
    }
    if (signatureId) corps.signatureId = signatureId;

    const res = await fetch(ficheId ? `/api/fiches-soudage/${ficheId}` : "/api/fiches-soudage", {
      method: ficheId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    setEnCours(false);
    if (!res.ok) {
      const corpsErr = await res.json().catch(() => null);
      setErreur(corpsErr?.error ?? "Impossible d'enregistrer.");
      return;
    }
    const donnees = await res.json();
    setFicheId(donnees.id);
    router.refresh();
    if (signatureId) onFermer();
  }

  if (dejaSignee) {
    return (
      <div style={{ border: "1px solid #ddd", padding: "0.6rem", marginTop: "0.4rem", maxWidth: 600 }}>
        <p style={{ color: "#0ca30c", fontSize: "0.85rem" }}>✓ Fiche de suivi de soudage signée (lecture seule).</p>
        <p style={{ fontSize: "0.85rem" }}>
          Joints couverts : {fiche?.joints.map(numeroAffiche).join(", ")}
        </p>
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
      {candidats.length > 1 && (
        <div style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>
          Joints couverts par cette fiche (cochez les autres soudures faites avec les mêmes paramètres) :
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.3rem" }}>
            {candidats.map((c) => (
              <label key={c.id} style={{ border: "1px solid #ddd", padding: "0.15rem 0.4rem", borderRadius: 4 }}>
                <input
                  type="checkbox"
                  checked={jointIds.includes(c.id)}
                  disabled={c.id === jointId}
                  onChange={(e) => cocher(c.id, e.target.checked)}
                />{" "}
                {libelleJoint(c)}
                {c.id === jointId && " (ce joint)"}
              </label>
            ))}
          </div>
        </div>
      )}
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
          Signer pour clore la fiche — {jointIds.length} joint(s) couvert(s) — (matricule/QR + PIN), plus aucune
          modification possible ensuite :
        </p>
        {!ficheId ? (
          <p style={{ fontSize: "0.8rem", color: "#898781" }}>Enregistrez d&apos;abord (sans signer) pour pouvoir signer.</p>
        ) : signatureId ? (
          <button type="submit" disabled={enCours}>
            {enCours ? "..." : "Confirmer et signer"}
          </button>
        ) : (
          <SignerQrPin
            documentType="FICHE_TECHNIQUE_SOUDAGE"
            documentId={ficheId}
            versionDocument={procede || "v1"}
            onSigne={setSignatureId}
          />
        )}
      </div>
    </form>
  );
}
