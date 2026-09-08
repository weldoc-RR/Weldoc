"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

// Validation de fin de fabrication : signature QR/matricule + PIN (voir
// src/components/signer-qr-pin.tsx), puis POST /api/affaires/[id]/rapport-fin-fabrication
// pour l'enregistrer comme validation de CE rapport précis (réservé au
// niveau 3, contrôlé côté serveur). Weldoc ne décide jamais seul : cette
// étape reste une action humaine explicite.
export function ValiderRapport({ affaireId }: { affaireId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [valide, setValide] = useState(false);

  async function onSigne(signatureId: string) {
    setErreur(null);
    const res = await fetch(`/api/affaires/${affaireId}/rapport-fin-fabrication`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureId }),
    });
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible d'enregistrer la validation.");
      return;
    }
    setValide(true);
    router.refresh();
  }

  if (valide) {
    return <p style={{ color: "#0ca30c" }}>✓ Rapport de fin de fabrication validé.</p>;
  }

  return (
    <div>
      <SignerQrPin
        documentType="RAPPORT_FIN_FABRICATION"
        documentId={affaireId}
        versionDocument={new Date().toISOString().slice(0, 10)}
        onSigne={onSigne}
      />
      {erreur && <p style={{ color: "crimson", fontSize: "0.85rem" }}>{erreur}</p>}
    </div>
  );
}
