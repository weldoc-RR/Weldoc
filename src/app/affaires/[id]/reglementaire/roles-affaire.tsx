"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Personne = { id: string; nom: string; prenom: string };

const CHAMPS = [
  { cle: "responsableId", libelle: "Responsable" },
  { cle: "chargeAffairesId", libelle: "Chargé d'affaires" },
  { cle: "coordinateurSoudageId", libelle: "Coordinateur soudage" },
] as const;

// Rôles de l'affaire (voir le cahier des charges, "ORGANIGRAMME CHANTIER") :
// alimentent automatiquement l'organigramme et le rapport de fin de
// fabrication (GET /api/affaires/[id]/organigramme), jusqu'ici saisissables
// uniquement à la création de l'affaire — modifiables ici à tout moment,
// via PATCH /api/affaires (réservé au niveau 2 minimum, déjà en place côté
// API).
export function RolesAffaire({
  affaireId,
  personnel,
  valeurs,
}: {
  affaireId: string;
  personnel: Personne[];
  valeurs: { responsableId: string | null; chargeAffairesId: string | null; coordinateurSoudageId: string | null };
}) {
  const router = useRouter();
  const [valeursCourantes, setValeursCourantes] = useState(valeurs);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function modifier(cle: (typeof CHAMPS)[number]["cle"], id: string) {
    const nouvelleValeur = id === "" ? null : id;
    setErreur(null);
    setEnCours(cle);
    const res = await fetch("/api/affaires", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: affaireId, [cle]: nouvelleValeur }),
    });
    setEnCours(null);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer.");
      return;
    }
    setValeursCourantes((v) => ({ ...v, [cle]: nouvelleValeur }));
    router.refresh();
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem" }}>Rôles de l&apos;affaire</h2>
      <p style={{ fontSize: "0.85rem", color: "#898781", margin: "0 0 0.4rem 0" }}>
        Alimentent automatiquement l&apos;organigramme et le rapport de fin de fabrication — modifiables à tout
        moment, sans jamais effacer l&apos;historique déjà consigné (audit trail, signatures) sous le nom de la
        personne précédente.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 420 }}>
        {CHAMPS.map(({ cle, libelle }) => (
          <label key={cle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.9rem" }}>
            {libelle}
            <select
              value={valeursCourantes[cle] ?? ""}
              disabled={enCours === cle}
              onChange={(e) => modifier(cle, e.target.value)}
              style={{ flex: 1, maxWidth: 260 }}
            >
              <option value="">— non désigné —</option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prenom} {p.nom}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {erreur && <p style={{ color: "crimson", fontSize: "0.8rem" }}>{erreur}</p>}
    </div>
  );
}
