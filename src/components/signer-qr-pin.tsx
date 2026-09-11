"use client";

import { useState } from "react";

// Widget réutilisable pour signer un document : identification (matricule
// ou QR) + PIN → POST /api/signatures. Voir l'avertissement du cahier des
// charges : le QR seul n'est jamais une signature, le PIN est toujours
// requis. Une fois signé, affiche qui a signé plutôt que de permettre de
// re-signer (une signature n'est pas modifiable).
export function SignerQrPin({
  documentType,
  documentId,
  versionDocument,
  onSigne,
}: {
  documentType: string;
  documentId: string;
  versionDocument: string;
  onSigne: (signatureId: string) => void;
}) {
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [signePar, setSignePar] = useState<string | null>(null);

  async function signer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/signatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, pin, documentType, documentId, versionDocument }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Signature refusée.");
      return;
    }
    const donnees = await res.json();
    setSignePar(`${donnees.personnel.prenom} ${donnees.personnel.nom}`);
    onSigne(donnees.signature.id as string);
  }

  if (signePar) {
    return <p style={{ fontSize: "0.85rem", color: "#0ca30c", margin: "0.3rem 0" }}>✓ Signé par {signePar}.</p>;
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
        {enCours ? "..." : "Signer"}
      </button>
      {erreur && <span style={{ color: "crimson", fontSize: "0.8rem" }}>{erreur}</span>}
    </form>
  );
}
