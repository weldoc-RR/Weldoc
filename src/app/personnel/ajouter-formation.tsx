"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Personnel = { id: string; nom: string; prenom: string };

// Enregistre une formation suivie (voir POST /api/formations). Un recyclage
// se traduit par un nouvel enregistrement, jamais par une modification du
// précédent : l'historique complet reste consultable sur la fiche de la
// personne.
export function AjouterFormation({ personnel }: { personnel: Personnel[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [intitule, setIntitule] = useState("");
  const [organisme, setOrganisme] = useState("");
  const [dateRealisation, setDateRealisation] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Enregistrer une formation
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/formations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId,
        intitule,
        organisme: organisme || undefined,
        dateRealisation: new Date(dateRealisation).toISOString(),
        dateExpiration: dateExpiration ? new Date(dateExpiration).toISOString() : undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette formation.");
      return;
    }
    setIntitule("");
    setOrganisme("");
    setDateRealisation("");
    setDateExpiration("");
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
        Intitulé de la formation
        <input required type="text" value={intitule} onChange={(e) => setIntitule(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Organisme (optionnel)
        <input type="text" value={organisme} onChange={(e) => setOrganisme(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date de réalisation
        <input required type="date" value={dateRealisation} onChange={(e) => setDateRealisation(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date d&apos;expiration (optionnel, si la formation doit être recyclée)
        <input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
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
