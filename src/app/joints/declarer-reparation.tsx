"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LIBELLE_ACTION: Record<string, string> = {
  REPARATION: "Réparation",
  MEULAGE: "Meulage",
  RESURFACAGE: "Resurfaçage",
  REPRISE: "Reprise",
  REMPLACEMENT: "Remplacement",
  CONTROLE_COMPLEMENTAIRE: "Contrôle complémentaire",
};

export function DeclarerReparation({
  jointId,
  fncsOuvertes,
}: {
  jointId: string;
  fncsOuvertes: { id: string; reference: string }[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [typeAction, setTypeAction] = useState<string>("REPARATION");
  const [fncOrigineId, setFncOrigineId] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem" }}>
        Déclarer une remise en conformité
      </button>
    );
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/joints/${jointId}/reparation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typeAction, fncOrigineId: fncOrigineId || undefined }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette remise en conformité.");
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={envoyer}
      style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center", marginLeft: "0.5rem" }}
    >
      <select value={typeAction} onChange={(e) => setTypeAction(e.target.value)}>
        {Object.entries(LIBELLE_ACTION).map(([valeur, libelle]) => (
          <option key={valeur} value={valeur}>
            {libelle}
          </option>
        ))}
      </select>
      {fncsOuvertes.length > 0 && (
        <select value={fncOrigineId} onChange={(e) => setFncOrigineId(e.target.value)}>
          <option value="">— sans lien vers une FNC —</option>
          {fncsOuvertes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.reference}
            </option>
          ))}
        </select>
      )}
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Valider"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</span>}
    </form>
  );
}
