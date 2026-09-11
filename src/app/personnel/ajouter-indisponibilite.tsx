"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Personnel = { id: string; nom: string; prenom: string };

// Déclare une période d'indisponibilité (congé, maladie, formation,
// autre — voir POST /api/indisponibilites), utilisée pour détecter les
// conflits avant une affectation (src/lib/planning.ts,
// evaluerAffectation) sans jamais bloquer l'affectation elle-même :
// l'alerte reste indicative, la décision de passer outre reste humaine.
export function AjouterIndisponibilite({ personnel }: { personnel: Personnel[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Déclarer une indisponibilité
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (new Date(dateFin) <= new Date(dateDebut)) {
      setErreur("La date de fin doit être après la date de début.");
      return;
    }

    setEnCours(true);
    const res = await fetch("/api/indisponibilites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId,
        dateDebut: new Date(dateDebut).toISOString(),
        dateFin: new Date(dateFin).toISOString(),
        motif,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer cette indisponibilité.");
      return;
    }
    setDateDebut("");
    setDateFin("");
    setMotif("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid var(--couleur-bordure)", padding: "1rem" }}>
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
        Motif (congé, maladie, formation, autre...)
        <input required type="text" value={motif} onChange={(e) => setMotif(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <label style={{ flex: 1 }}>
          Date de début
          <input required type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Date de fin
          <input required type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
    </form>
  );
}
