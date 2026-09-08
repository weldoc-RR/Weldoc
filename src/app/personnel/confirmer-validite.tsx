"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Joint = { id: string; numero: string; indiceReparation: number };

export function ConfirmerValidite({ qualificationId, personnelId }: { qualificationId: string; personnelId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [joints, setJoints] = useState<Joint[] | null>(null);
  const [jointIdsChoisis, setJointIdsChoisis] = useState<string[]>([]);
  const [enCours, setEnCours] = useState(false);

  async function ouvrir() {
    setOuvert(true);
    if (joints === null) {
      const res = await fetch(`/api/joints?soudeurId=${personnelId}`);
      if (res.ok) setJoints(await res.json());
    }
  }

  function basculerJoint(id: string) {
    setJointIdsChoisis((actuels) => (actuels.includes(id) ? actuels.filter((j) => j !== id) : [...actuels, id]));
  }

  async function confirmer() {
    setEnCours(true);
    const res = await fetch(`/api/qualifications/${qualificationId}/evenements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "CONFIRMATION_VALIDITE", preuveJointIds: jointIdsChoisis }),
    });
    setEnCours(false);
    if (res.ok) {
      setOuvert(false);
      setJointIdsChoisis([]);
      router.refresh();
    }
  }

  if (!ouvert) {
    return (
      <button onClick={ouvrir} style={{ marginLeft: "0.5rem" }}>
        Confirmer la validité
      </button>
    );
  }

  return (
    <div style={{ display: "inline-block", marginLeft: "0.5rem", border: "1px solid #ddd", padding: "0.5rem" }}>
      <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.85rem" }}>
        Confirmation par essai (rien à cocher), ou en s&apos;appuyant sur des joints déjà soudés comme preuve
        d&apos;activité :
      </p>
      {joints === null ? (
        <p style={{ fontSize: "0.85rem" }}>Chargement des joints...</p>
      ) : joints.length === 0 ? (
        <p style={{ fontSize: "0.85rem" }}>Aucun joint soudé par cette personne pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.4rem 0", maxHeight: 120, overflowY: "auto" }}>
          {joints.map((j) => (
            <li key={j.id}>
              <label style={{ fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  checked={jointIdsChoisis.includes(j.id)}
                  onChange={() => basculerJoint(j.id)}
                />{" "}
                {j.numero}
                {j.indiceReparation > 0 ? ` R${j.indiceReparation}` : ""}
              </label>
            </li>
          ))}
        </ul>
      )}
      <button onClick={confirmer} disabled={enCours}>
        {enCours ? "..." : "Valider"}
      </button>
      <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
        Annuler
      </button>
    </div>
  );
}
