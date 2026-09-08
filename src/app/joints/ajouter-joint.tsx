"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Affaire = { id: string; numero: string; client: string };
type Personnel = { id: string; nom: string; prenom: string };
type Matiere = { id: string; affaireId: string; designation: string; nuance: string };

export function AjouterJoint({
  affaires,
  soudeurs,
  matieres,
}: {
  affaires: Affaire[];
  soudeurs: Personnel[];
  matieres: Matiere[];
}) {
  const router = useRouter();
  const [affaireId, setAffaireId] = useState(affaires[0]?.id ?? "");
  const [ligne, setLigne] = useState("");
  const [typeJoint, setTypeJoint] = useState("");
  const [dn, setDn] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [soudeurId, setSoudeurId] = useState("");
  const [wpsReference, setWpsReference] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const matieresAffaire = matieres.filter((m) => m.affaireId === affaireId);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/joints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        ligne: ligne || undefined,
        typeJoint: typeJoint || undefined,
        dn: dn || undefined,
        matiereId: matiereId || undefined,
        soudeurId: soudeurId || undefined,
        wpsReference: wpsReference || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de créer ce joint.");
      return;
    }
    setLigne("");
    setTypeJoint("");
    setDn("");
    setMatiereId("");
    setSoudeurId("");
    setWpsReference("");
    router.refresh();
  }

  if (affaires.length === 0) {
    return <p>Créez d&apos;abord une affaire avant de pouvoir ajouter un joint.</p>;
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480 }}>
      <label>
        Affaire
        <select
          value={affaireId}
          onChange={(e) => {
            setAffaireId(e.target.value);
            setMatiereId("");
          }}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        >
          {affaires.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero} — {a.client}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#52514e" }}>
        Le numéro du joint (M800, M801...) est attribué automatiquement.
      </p>
      <label>
        Ligne / spool (optionnel)
        <input type="text" value={ligne} onChange={(e) => setLigne(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Type de joint (optionnel)
        <input type="text" value={typeJoint} onChange={(e) => setTypeJoint(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        DN (optionnel)
        <input type="text" value={dn} onChange={(e) => setDn(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Matière (optionnel)
        <select value={matiereId} onChange={(e) => setMatiereId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="">— non précisée —</option>
          {matieresAffaire.map((m) => (
            <option key={m.id} value={m.id}>
              {m.designation} ({m.nuance})
            </option>
          ))}
        </select>
      </label>
      <label>
        Soudeur (optionnel)
        <select value={soudeurId} onChange={(e) => setSoudeurId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="">— non précisé —</option>
          {soudeurs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.prenom} {p.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        Référence WPS (optionnel)
        <input type="text" value={wpsReference} onChange={(e) => setWpsReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <button type="submit" disabled={enCours}>
        {enCours ? "Création..." : "Créer le joint"}
      </button>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
