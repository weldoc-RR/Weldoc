"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Valeurs = {
  libelleActivite: string | null;
  tranche: string | null;
  metier: string | null;
  equipementsConcernes: string[];
  otTaches: string[];
  domaineRequisInstallation: string | null;
  conditionsParticulieresPrealables: string | null;
  numeroAdrModele: string | null;
};

// Édite l'en-tête d'activité de la fiche de suivi (voir le cahier des
// charges, "FICHE DE SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR PHASE"),
// porté par l'affaire — PATCH /api/affaires/[id]. Les listes
// (équipements, OT/tâches) se saisissent une ligne par élément.
export function FormulaireEnTete({ affaireId, valeurs }: { affaireId: string; valeurs: Valeurs }) {
  const router = useRouter();
  const [libelleActivite, setLibelleActivite] = useState(valeurs.libelleActivite ?? "");
  const [tranche, setTranche] = useState(valeurs.tranche ?? "");
  const [metier, setMetier] = useState(valeurs.metier ?? "");
  const [equipementsConcernes, setEquipementsConcernes] = useState(valeurs.equipementsConcernes.join("\n"));
  const [otTaches, setOtTaches] = useState(valeurs.otTaches.join("\n"));
  const [domaineRequisInstallation, setDomaineRequisInstallation] = useState(valeurs.domaineRequisInstallation ?? "");
  const [conditionsParticulieresPrealables, setConditionsParticulieresPrealables] = useState(
    valeurs.conditionsParticulieresPrealables ?? ""
  );
  const [numeroAdrModele, setNumeroAdrModele] = useState(valeurs.numeroAdrModele ?? "");
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function versListe(texte: string): string[] {
    return texte
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(false);
    setEnCours(true);

    const res = await fetch(`/api/affaires/${affaireId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        libelleActivite: libelleActivite || null,
        tranche: tranche || null,
        metier: metier || null,
        equipementsConcernes: versListe(equipementsConcernes),
        otTaches: versListe(otTaches),
        domaineRequisInstallation: domaineRequisInstallation || null,
        conditionsParticulieresPrealables: conditionsParticulieresPrealables || null,
        numeroAdrModele: numeroAdrModele || null,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer.");
      return;
    }
    setSucces(true);
    router.refresh();
  }

  return (
    <form onSubmit={enregistrer} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 640 }}>
      <label>
        Libellé de l&apos;activité
        <input type="text" value={libelleActivite} onChange={(e) => setLibelleActivite(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <label style={{ flex: 1 }}>
          Tranche
          <input type="text" value={tranche} onChange={(e) => setTranche(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Métier
          <input type="text" value={metier} onChange={(e) => setMetier(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
        </label>
      </div>
      <label>
        Équipement(s) concerné(s) <span style={{ fontWeight: 400, color: "var(--couleur-texte-discret)" }}>(un par ligne)</span>
        <textarea value={equipementsConcernes} onChange={(e) => setEquipementsConcernes(e.target.value)} rows={3} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      <label>
        OT / tâche(s) <span style={{ fontWeight: 400, color: "var(--couleur-texte-discret)" }}>(un par ligne)</span>
        <textarea value={otTaches} onChange={(e) => setOtTaches(e.target.value)} rows={3} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      <label>
        Domaine requis d&apos;installation / événements générés
        <textarea value={domaineRequisInstallation} onChange={(e) => setDomaineRequisInstallation(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      <label>
        Conditions particulières et préalables
        <textarea value={conditionsParticulieresPrealables} onChange={(e) => setConditionsParticulieresPrealables(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      <label>
        Numéro ADR du modèle de document
        <input type="text" value={numeroAdrModele} onChange={(e) => setNumeroAdrModele(e.target.value)} style={{ display: "block", width: "100%", padding: "0.5rem" }} />
      </label>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
      <div>
        <button type="submit" disabled={enCours} style={{ background: "var(--couleur-primaire)", color: "#fff", borderColor: "var(--couleur-primaire)", fontWeight: 600 }}>
          {enCours ? "Enregistrement..." : "Enregistrer l'en-tête"}
        </button>
        {succes && <span style={{ color: "var(--couleur-conforme)", marginLeft: "0.6rem", fontSize: "0.85rem" }}>✓ Enregistré</span>}
      </div>
    </form>
  );
}
