"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhaseLigne } from "./phase-ligne";

type Procedure = { id: string; reference: string; version: string; titre: string };
type Phase = { id: string; nom: string; statut: string; justificationNA: string | null; procedureInterneId: string | null };
type InfoSignature = { nom: string; prenom: string; dateSignature: string };
type Sequence = { id: string; nom: string; phases: Phase[] };

// Signature groupée des phases (voir le cahier des charges,
// "IDENTIFICATION ET SIGNATURE") : l'exécutant coche les phases qu'il
// vient de réaliser, s'identifie UNE seule fois (QR/matricule + code PIN),
// et ça vaut signature pour chacune des phases cochées — POST
// /api/phases/signer. Ne concerne que A_FAIRE/EN_COURS : une phase déjà
// terminée ou non applicable ne se signe pas une deuxième fois.
export function PhasesSection({
  sequencesAvecPhases,
  procedures,
  signatures,
}: {
  sequencesAvecPhases: Sequence[];
  procedures: Procedure[];
  signatures: Record<string, InfoSignature>;
}) {
  const router = useRouter();
  const [selectionnees, setSelectionnees] = useState<Set<string>>(new Set());
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);

  function toggle(id: string) {
    setSelectionnees((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  async function signer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setEnCours(true);

    const res = await fetch("/api/phases/signer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseIds: [...selectionnees], identifiant, pin }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de signer.");
      return;
    }
    setSucces(`${selectionnees.size} phase(s) signée(s).`);
    setSelectionnees(new Set());
    setPin("");
    router.refresh();
  }

  return (
    <div>
      {sequencesAvecPhases.every((s) => s.phases.length === 0) ? (
        <p>Aucune phase pour l&apos;instant.</p>
      ) : (
        sequencesAvecPhases.map(
          (s) =>
            s.phases.length > 0 && (
              <div key={s.id} style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.2rem" }}>{s.nom}</h3>
                {s.phases.map((p) => (
                  <PhaseLigne
                    key={p.id}
                    phase={p}
                    procedures={procedures}
                    signature={signatures[p.id]}
                    selection={
                      p.statut === "TERMINEE" || p.statut === "NON_APPLICABLE"
                        ? undefined
                        : { coche: selectionnees.has(p.id), onToggle: () => toggle(p.id) }
                    }
                  />
                ))}
              </div>
            )
        )
      )}

      <form
        onSubmit={signer}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          marginTop: "1rem",
          padding: "0.75rem",
          border: "1px solid var(--couleur-bordure)",
          background: "var(--couleur-fond-discret)",
        }}
      >
        <strong>
          {selectionnees.size === 0 ? "Aucune phase sélectionnée" : `${selectionnees.size} phase(s) sélectionnée(s)`}
        </strong>
        <input
          required
          type="text"
          placeholder="Matricule ou QR"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          disabled={selectionnees.size === 0}
          style={{ width: 140, padding: "0.3rem" }}
        />
        <input
          required
          type="password"
          inputMode="numeric"
          placeholder="Code PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={selectionnees.size === 0}
          style={{ width: 100, padding: "0.3rem" }}
        />
        <button type="submit" disabled={selectionnees.size === 0 || enCours}>
          {enCours ? "Signature..." : "Signer les phases cochées"}
        </button>
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.85rem" }}>{erreur}</span>}
        {succes && <span style={{ color: "var(--couleur-conforme)", fontSize: "0.85rem" }}>✓ {succes}</span>}
      </form>
      <p style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)", marginTop: "0.3rem" }}>
        Cocher une ou plusieurs phases réalisées, puis s&apos;identifier une seule fois (même code PIN que pour
        signer un document) : ça vaut signature pour chacune et les passe &quot;Terminée&quot;.
      </p>
    </div>
  );
}
