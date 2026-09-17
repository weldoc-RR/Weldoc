"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Crée l'affaire (POST /api/affaires, qui met en place les 5 séquences par
// défaut du dossier de fabrication) puis redirige directement vers la
// fiche de suivi d'activité de cette affaire, pour que son en-tête
// (activité, site/tranche, équipements, OT/tâches...) se remplisse tout de
// suite plutôt que d'être oublié — voir le cahier des charges, "FICHE DE
// SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR PHASE".
export default function NouvelleAffairePage() {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [client, setClient] = useState("");
  const [projet, setProjet] = useState("");
  const [typeRealisation, setTypeRealisation] = useState("CHANTIER");
  const [chantier, setChantier] = useState("");
  const [site, setSite] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/affaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        client,
        projet,
        typeRealisation,
        chantier: chantier || undefined,
        site: site || undefined,
        dateDebut: dateDebut ? new Date(dateDebut).toISOString() : undefined,
        dateFin: dateFin ? new Date(dateFin).toISOString() : undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de créer l'affaire (numéro déjà utilisé ?).");
      return;
    }
    const affaire = await res.json();
    router.push(`/affaires/${affaire.id}/fiche-activite`);
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 560 }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Nouvelle affaire</h1>
      <p style={{ color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        Les informations générales suffisent pour démarrer : le dossier de fabrication (séquences, phases) se met en
        place automatiquement. L&apos;étape suivante propose de compléter la fiche de suivi d&apos;activité.
      </p>
      <form onSubmit={creer} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
        <label>
          Numéro d&apos;affaire
          <input required type="text" value={numero} onChange={(e) => setNumero(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
        </label>
        <label>
          Client
          <input required type="text" value={client} onChange={(e) => setClient(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
        </label>
        <label>
          Projet
          <input required type="text" value={projet} onChange={(e) => setProjet(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
        </label>
        <label>
          Type de réalisation
          <select value={typeRealisation} onChange={(e) => setTypeRealisation(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }}>
            <option value="CHANTIER">Chantier</option>
            <option value="ATELIER">Atelier</option>
          </select>
        </label>
        <label>
          Chantier
          <input type="text" value={chantier} onChange={(e) => setChantier(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
        </label>
        <label>
          Site
          <input type="text" value={site} onChange={(e) => setSite(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
        </label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <label style={{ flex: 1 }}>
            Date de début
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
          </label>
          <label style={{ flex: 1 }}>
            Date de fin
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
          </label>
        </div>
        {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
        <button
          type="submit"
          disabled={enCours}
          style={{ background: "var(--couleur-primaire)", color: "#fff", borderColor: "var(--couleur-primaire)", fontWeight: 600 }}
        >
          {enCours ? "Création..." : "Créer l'affaire et continuer"}
        </button>
      </form>
    </main>
  );
}
