"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Personnel = { id: string; nom: string; prenom: string };
type Joint = { id: string; numeroAffiche: string };
type Candidat = { personnelId: string; nom: string; prenom: string; alertes: string[] };

// Affecte une personne à une fonction/activité (et éventuellement un joint
// précis) pour une période donnée, avec ses codes d'habilitation/accès
// site (voir POST /api/affectations). Les alertes retournées (compétence,
// qualification, habilitation, disponibilité) sont indicatives — la
// décision de passer outre reste humaine.
export function AjouterAffectation({ affaireId, personnel, joints }: { affaireId: string; personnel: Personnel[]; joints: Joint[] }) {
  const router = useRouter();
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [fonction, setFonction] = useState("");
  const [jointId, setJointId] = useState("");
  const [codes, setCodes] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [dureeEstimeeMin, setDureeEstimeeMin] = useState("");
  const [alertes, setAlertes] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [candidats, setCandidats] = useState<Candidat[] | null>(null);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);

  async function chercherCandidats() {
    setRechercheEnCours(true);
    setErreur(null);
    const params = new URLSearchParams({
      fonction,
      dateDebut: new Date(dateDebut).toISOString(),
      dateFin: new Date(dateFin).toISOString(),
    });
    if (jointId) params.set("jointId", jointId);
    const res = await fetch(`/api/affectations/proposition?${params}`);
    setRechercheEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de proposer des personnes.");
      return;
    }
    setCandidats(await res.json());
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setAlertes([]);
    setEnCours(true);

    const res = await fetch("/api/affectations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        personnelId,
        fonction,
        jointId: jointId || undefined,
        codes: codes || undefined,
        dateDebut: new Date(dateDebut).toISOString(),
        dateFin: new Date(dateFin).toISOString(),
        dureeEstimeeMin: dureeEstimeeMin ? Number(dureeEstimeeMin) : undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer cette affectation.");
      return;
    }
    const corps = await res.json();
    setAlertes(corps.alertes ?? []);
    setFonction("");
    setJointId("");
    setCodes("");
    setDateDebut("");
    setDateFin("");
    setDureeEstimeeMin("");
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
        Fonction / activité (ex. soudeur, tuyauteur, chef de poste...)
        <input required type="text" value={fonction} onChange={(e) => setFonction(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      {joints.length > 0 && (
        <label>
          Joint/pièce concerné (optionnel)
          <select value={jointId} onChange={(e) => setJointId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
            <option value="">— aucun —</option>
            {joints.map((j) => (
              <option key={j.id} value={j.id}>
                {j.numeroAffiche}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Codes d&apos;habilitation/accès site (optionnel, ex. SN2, M2, CT, RP2...)
        <input type="text" value={codes} onChange={(e) => setCodes(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      {jointId && (
        <label>
          Temps prévu (minutes, optionnel — voir "Temps et productivité")
          <input type="number" step="1" value={dureeEstimeeMin} onChange={(e) => setDureeEstimeeMin(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      )}
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
        <button
          type="button"
          disabled={rechercheEnCours || !fonction || !dateDebut || !dateFin}
          onClick={chercherCandidats}
        >
          {rechercheEnCours ? "Recherche..." : "Voir les personnes adaptées"}
        </button>
      </div>
      {candidats && (
        <div style={{ fontSize: "0.85rem", border: "1px solid #eee", padding: "0.5rem" }}>
          {candidats.length === 0 ? (
            <p style={{ margin: 0, color: "#898781" }}>Personne n&apos;a la fonction &quot;{fonction}&quot;.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {candidats.map((c) => (
                <li key={c.personnelId} style={{ marginBottom: "0.3rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonnelId(c.personnelId);
                      setCandidats(null);
                    }}
                    style={{
                      fontWeight: c.alertes.length === 0 ? "bold" : "normal",
                      color: c.alertes.length === 0 ? "#0ca30c" : "inherit",
                    }}
                  >
                    {c.prenom} {c.nom} {c.alertes.length === 0 ? "— disponible et qualifié(e)" : `— ${c.alertes.length} alerte(s)`}
                  </button>
                  {c.alertes.length > 0 && (
                    <ul style={{ margin: "0.1rem 0 0 1rem", padding: 0 }}>
                      {c.alertes.map((a, i) => (
                        <li key={i} style={{ color: "darkorange", fontSize: "0.8rem" }}>
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Affecter"}
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
      {alertes.length > 0 && (
        <ul style={{ margin: 0 }}>
          {alertes.map((a, i) => (
            <li key={i} style={{ color: "darkorange", fontSize: "0.85rem" }}>
              {a}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
