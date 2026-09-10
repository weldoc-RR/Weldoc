"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignerQrPin } from "@/components/signer-qr-pin";

export function ValiderReconduction({ qualificationId }: { qualificationId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nouvelleDateExpiration, setNouvelleDateExpiration] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem" }}>
        Valider la reconduction
      </button>
    );
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/qualifications/${qualificationId}/evenements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "RECONDUCTION_VALIDEE",
        nouvelleDateExpiration: new Date(nouvelleDateExpiration).toISOString(),
        commentaire: commentaire || undefined,
        signatureId: signatureId ?? undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de valider (réservé au niveau 3, une date est requise).");
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={valider} style={{ display: "block", marginTop: "0.3rem", border: "1px solid var(--couleur-bordure)", padding: "0.5rem" }}>
      <p style={{ fontSize: "0.8rem", color: "var(--couleur-texte-discret)", margin: "0 0 0.3rem 0" }}>
        Rappel : selon la plupart des référentiels, une reconduction par l&apos;activité ne remplace pas
        indéfiniment la qualification initiale — vérifiez qu&apos;un nouvel essai de qualification n&apos;est pas
        dû (périodicité propre à votre référentiel, ex. tous les 3 ans).
      </p>
      <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: "0.85rem" }}>
          Nouvelle échéance{" "}
          <input
            required
            type="date"
            value={nouvelleDateExpiration}
            onChange={(e) => setNouvelleDateExpiration(e.target.value)}
          />
        </label>
        <input
          type="text"
          placeholder="Commentaire (optionnel)"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          style={{ fontSize: "0.85rem" }}
        />
      </div>
      <div style={{ marginTop: "0.4rem" }}>
        <p style={{ fontSize: "0.8rem", margin: "0 0 0.2rem 0" }}>
          Signature de la décision (identification QR/matricule + PIN de la personne niveau 3 qui valide) :
        </p>
        <SignerQrPin
          documentType="QualificationEvenement"
          documentId={qualificationId}
          versionDocument="RECONDUCTION_VALIDEE"
          onSigne={setSignatureId}
        />
      </div>
      <div style={{ marginTop: "0.4rem" }}>
        <button type="submit" disabled={enCours || !signatureId}>
          {enCours ? "..." : "Confirmer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.4rem" }}>
          Annuler
        </button>
        {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.85rem", marginLeft: "0.4rem" }}>{erreur}</span>}
      </div>
    </form>
  );
}
