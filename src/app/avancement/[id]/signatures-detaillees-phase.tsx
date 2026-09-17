"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SignatureDetaillee = {
  id: string;
  fonction: string;
  habilitation: string | null;
  nni: string | null;
  entrepriseService: string | null;
  personnel: { nom: string; prenom: string };
  signature: { dateSignature: string };
};

const LIBELLE_FONCTION: Record<string, string> = {
  EXECUTANT: "Exécutant",
  CONTROLEUR_TECHNIQUE: "Contrôleur technique",
  SURVEILLANT: "Surveillant",
  VERIFICATEUR: "Vérificateur",
};

// Tableau "qui a signé" d'une phase à contrôle technique (voir le cahier
// des charges, "FICHE DE SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR
// PHASE") : une ligne par signature, avec la fonction tenue, l'habilitation,
// le NNI et l'entreprise/service saisis au moment de signer — POST
// /api/phases/signatures-detaillees. Une même personne peut apparaître
// plusieurs fois pour des fonctions différentes ; chaque ligne est une
// signature réelle (QR/matricule + PIN), jamais une simple case cochée.
export function SignaturesDetailleesPhase({ phaseId, signatures }: { phaseId: string; signatures: SignatureDetaillee[] }) {
  const router = useRouter();
  const [fonction, setFonction] = useState("EXECUTANT");
  const [habilitation, setHabilitation] = useState("");
  const [nni, setNni] = useState("");
  const [entrepriseService, setEntrepriseService] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function signer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/phases/signatures-detaillees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseId, fonction, habilitation, nni, entrepriseService, identifiant, pin }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de signer.");
      return;
    }
    setHabilitation("");
    setNni("");
    setEntrepriseService("");
    setPin("");
    router.refresh();
  }

  return (
    <div>
      {signatures.length === 0 ? (
        <p style={{ fontSize: "0.8rem", color: "var(--couleur-texte-discret)", margin: "0 0 0.5rem 0" }}>
          Aucune signature détaillée pour l&apos;instant.
        </p>
      ) : (
        <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse", marginBottom: "0.5rem" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--couleur-texte-attenue)" }}>
              <th style={{ padding: "0.2rem 0.4rem" }}>Fonction</th>
              <th style={{ padding: "0.2rem 0.4rem" }}>Nom</th>
              <th style={{ padding: "0.2rem 0.4rem" }}>Habilitation</th>
              <th style={{ padding: "0.2rem 0.4rem" }}>NNI</th>
              <th style={{ padding: "0.2rem 0.4rem" }}>Entreprise / service</th>
              <th style={{ padding: "0.2rem 0.4rem" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {signatures.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--couleur-bordure)" }}>
                <td style={{ padding: "0.2rem 0.4rem" }}>{LIBELLE_FONCTION[s.fonction] ?? s.fonction}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>
                  {s.personnel.prenom} {s.personnel.nom}
                </td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{s.habilitation ?? "—"}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{s.nni ?? "—"}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{s.entrepriseService ?? "—"}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{new Date(s.signature.dateSignature).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={signer} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
        <select value={fonction} onChange={(e) => setFonction(e.target.value)} style={{ fontSize: "0.8rem", padding: "0.2rem" }}>
          {Object.entries(LIBELLE_FONCTION).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
        <input type="text" placeholder="Habilitation" value={habilitation} onChange={(e) => setHabilitation(e.target.value)} style={{ fontSize: "0.8rem", padding: "0.2rem", width: 110 }} />
        <input type="text" placeholder="NNI" value={nni} onChange={(e) => setNni(e.target.value)} style={{ fontSize: "0.8rem", padding: "0.2rem", width: 90 }} />
        <input
          type="text"
          placeholder="Entreprise / service"
          value={entrepriseService}
          onChange={(e) => setEntrepriseService(e.target.value)}
          style={{ fontSize: "0.8rem", padding: "0.2rem", width: 140 }}
        />
        <input
          required
          type="text"
          placeholder="Matricule ou QR"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          style={{ fontSize: "0.8rem", padding: "0.2rem", width: 110 }}
        />
        <input
          required
          type="password"
          inputMode="numeric"
          placeholder="Code PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ fontSize: "0.8rem", padding: "0.2rem", width: 90 }}
        />
        <button type="submit" disabled={enCours} style={{ fontSize: "0.8rem" }}>
          {enCours ? "..." : "Signer"}
        </button>
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.75rem" }}>{erreur}</span>}
      </form>
    </div>
  );
}
