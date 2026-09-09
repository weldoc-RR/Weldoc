"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BilanIntervention = {
  entiteEmettrice: string | null;
  referenceOffreService: string | null;
  accessibilite: string | null;
  definitionIntervention: string | null;
  rexPosesDeposes: string | null;
  ecartsTravauxPrevusRealises: string | null;
  conformiteTravaux: string | null;
  bilanActionsRadioprotection: string | null;
  analyseEcartsRadioprotectionAmelioration: string | null;
  bonnesPratiques: string | null;
  dysfonctionnements: string | null;
  mesuresCorrectivesSuivantes: string | null;
} | null;

const CHAMPS: { cle: keyof NonNullable<BilanIntervention>; label: string }[] = [
  { cle: "entiteEmettrice", label: "Entité émettrice" },
  { cle: "referenceOffreService", label: "Référence de l'offre de service" },
  { cle: "definitionIntervention", label: "Définition de l'intervention" },
  { cle: "rexPosesDeposes", label: "REX sur les poses/déposes (DMP/MTI/DDC, si applicable)" },
  { cle: "ecartsTravauxPrevusRealises", label: "Écarts entre travaux prévus et réalisés" },
  { cle: "conformiteTravaux", label: "Conformité des travaux" },
  { cle: "bilanActionsRadioprotection", label: "Bilan des actions radioprotection" },
  { cle: "analyseEcartsRadioprotectionAmelioration", label: "Analyse des écarts et proposition d'amélioration (radioprotection)" },
  { cle: "bonnesPratiques", label: "Bonnes pratiques" },
  { cle: "dysfonctionnements", label: "Dysfonctionnements rencontrés" },
  { cle: "mesuresCorrectivesSuivantes", label: "Mesures correctives pour l'intervention suivante" },
];

const ACCESSIBILITES = ["LIBRE", "INTERNE", "LIMITEE", "CONFIDENTIELLE"] as const;

// Formulaire unique pour tout le contenu narratif du RFI (voir le modèle
// réel) : un seul PATCH /api/affaires/[id]/bilan-intervention. Replié par
// défaut pour ne pas alourdir la page quand tout est déjà rempli.
export function FormulaireBilanIntervention({ affaireId, valeurs }: { affaireId: string; valeurs: BilanIntervention }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [champs, setChamps] = useState<Record<string, string>>(() =>
    Object.fromEntries(CHAMPS.map((c) => [c.cle, valeurs?.[c.cle] ?? ""]))
  );
  const [accessibilite, setAccessibilite] = useState(valeurs?.accessibilite ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const corps: Record<string, string | undefined> = { accessibilite: accessibilite || undefined };
    for (const c of CHAMPS) corps[c.cle] = champs[c.cle] || undefined;

    const res = await fetch(`/api/affaires/${affaireId}/bilan-intervention`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer.");
      return;
    }
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button className="no-print" onClick={() => setOuvert(true)} style={{ marginBottom: "0.5rem" }}>
        Modifier le bilan et le cartouche
      </button>
    );
  }

  return (
    <form onSubmit={enregistrer} className="no-print" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 600, marginBottom: "1rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Accessibilité
        <select value={accessibilite} onChange={(e) => setAccessibilite(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          <option value="">— non précisée —</option>
          {ACCESSIBILITES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      {CHAMPS.map((c) => (
        <label key={c.cle}>
          {c.label}
          <textarea
            value={champs[c.cle]}
            onChange={(e) => setChamps((v) => ({ ...v, [c.cle]: e.target.value }))}
            rows={c.cle === "entiteEmettrice" || c.cle === "referenceOffreService" ? 1 : 2}
            style={{ display: "block", width: "100%", padding: "0.4rem", fontFamily: "inherit" }}
          />
        </label>
      ))}
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Fermer
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
