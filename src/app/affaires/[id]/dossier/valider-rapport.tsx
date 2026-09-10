"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Validation de fin de fabrication : identification QR/matricule + PIN,
// envoyées directement à POST /api/affaires/[id]/rapport-fin-fabrication
// (et non via le composant générique SignerQrPin + POST /api/signatures) :
// cette route crée elle-même la signature, mais seulement APRÈS avoir
// vérifié qu'aucun point réglementaire bloquant ne subsiste — pour qu'une
// signature de validation ne puisse jamais exister sans validation
// réellement aboutie (voir src/lib/signature.ts). Weldoc ne décide jamais
// seul : cette étape reste une action humaine explicite.
export function ValiderRapport({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [valide, setValide] = useState(false);

  async function signer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/affaires/${affaireId}/rapport-fin-fabrication`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, pin }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer la validation.");
      return;
    }
    setValide(true);
    router.refresh();
  }

  if (valide) {
    return <p style={{ color: "var(--couleur-conforme)" }}>✓ Rapport de fin de fabrication validé.</p>;
  }

  return (
    <form onSubmit={signer} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
      <input
        required
        type="text"
        placeholder="Matricule ou QR"
        value={identifiant}
        onChange={(e) => setIdentifiant(e.target.value)}
        style={{ width: 130, fontSize: "0.85rem", padding: "0.2rem" }}
      />
      <input
        required
        type="password"
        placeholder="Code PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ width: 90, fontSize: "0.85rem", padding: "0.2rem" }}
      />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Signer et valider"}
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
    </form>
  );
}
