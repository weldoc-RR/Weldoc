"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Validation de la fiche de suivi d'activité par un préparateur (voir
// POST /api/affaires/[id]/valider-fiche-activite) : identification QR/
// matricule + PIN, comme les autres signatures — l'API vérifie elle-même
// que la personne identifiée tient bien la fonction "Préparateur" avant
// de créer la signature. Une fois validée, le séquencement des phases se
// verrouille automatiquement (voir POST/DELETE /api/phases).
export function ValiderFicheActivite({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/affaires/${affaireId}/valider-fiche-activite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, pin }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de valider.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="no-print" style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid var(--couleur-bordure)", background: "var(--couleur-fond-discret)" }}>
      <p style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.4rem 0" }}>Valider la fiche</p>
      <p style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", margin: "0 0 0.5rem 0" }}>
        Une fois validée par un préparateur, le séquencement des phases (ajout/suppression) ne peut plus être modifié — la fiche
        est prête pour la production.
      </p>
      <form onSubmit={valider} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
        <input
          required
          type="text"
          placeholder="Matricule ou QR (préparateur)"
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          style={{ fontSize: "0.85rem", padding: "0.3rem", width: 190 }}
        />
        <input
          required
          type="password"
          inputMode="numeric"
          placeholder="Code PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ fontSize: "0.85rem", padding: "0.3rem", width: 100 }}
        />
        <button
          type="submit"
          disabled={enCours}
          style={{ background: "var(--couleur-primaire)", color: "#fff", borderColor: "var(--couleur-primaire)", fontWeight: 600 }}
        >
          {enCours ? "..." : "Signer et valider"}
        </button>
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
      </form>
    </div>
  );
}
