"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIBELLE_NIVEAU } from "@/lib/niveaux";
import { FONCTIONS_SUGGEREES } from "@/lib/verificationRole";

// Crée une fiche personne (voir POST /api/personnel — jusqu'ici seule
// l'API existait, aucun écran pour embaucher/enregistrer quelqu'un sans
// passer par un accès technique). Réservé au niveau 2 minimum, comme la
// route (la toute première fiche de l'entreprise s'amorce librement côté
// API, avant qu'aucun compte n'existe pour afficher ce bouton).
export function AjouterPersonnel() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [matricule, setMatricule] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [societe, setSociete] = useState("");
  const [niveau, setNiveau] = useState<"NIVEAU_1" | "NIVEAU_2" | "NIVEAU_3">("NIVEAU_1");
  const [fonction, setFonction] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Enregistrer une personne
      </button>
    );
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/personnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matricule,
        nom,
        prenom,
        societe,
        niveau,
        fonctions: fonction.trim() ? [fonction.trim()] : undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error?.fieldErrors?.matricule?.[0] ?? "Impossible d'enregistrer cette personne (matricule déjà utilisé ?).");
      return;
    }
    setMatricule("");
    setNom("");
    setPrenom("");
    setSociete("");
    setNiveau("NIVEAU_1");
    setFonction("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={creer} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 420, marginBottom: "1.5rem", border: "1px solid var(--couleur-bordure)", borderRadius: "var(--rayon-carte)", boxShadow: "var(--ombre-legere)", padding: "1rem" }}>
      <label>
        Matricule
        <input required type="text" value={matricule} onChange={(e) => setMatricule(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <label style={{ flex: 1 }}>
          Prénom
          <input required type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
        <label style={{ flex: 1 }}>
          Nom
          <input required type="text" value={nom} onChange={(e) => setNom(e.target.value)} style={{ display: "block", width: "100%" }} />
        </label>
      </div>
      <label>
        Société
        <input required type="text" value={societe} onChange={(e) => setSociete(e.target.value)} style={{ display: "block", width: "100%" }} />
      </label>
      <label>
        Niveau de décision
        <select value={niveau} onChange={(e) => setNiveau(e.target.value as typeof niveau)} style={{ display: "block", width: "100%" }}>
          {(["NIVEAU_1", "NIVEAU_2", "NIVEAU_3"] as const).map((n) => (
            <option key={n} value={n}>
              {LIBELLE_NIVEAU[n]} ({n.replace("NIVEAU_", "niveau ")})
            </option>
          ))}
        </select>
      </label>
      <label>
        Fonction (optionnel — d&apos;autres pourront être ajoutées ensuite)
        <input
          list="fonctions-suggerees-nouvelle-personne"
          type="text"
          placeholder="ex. Soudeur"
          value={fonction}
          onChange={(e) => setFonction(e.target.value)}
          style={{ display: "block", width: "100%" }}
        />
        <datalist id="fonctions-suggerees-nouvelle-personne">
          {FONCTIONS_SUGGEREES.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </label>
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
