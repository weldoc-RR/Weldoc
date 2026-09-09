"use client";

import { useState } from "react";

type MatiereTrouvee = {
  id: string;
  designation: string;
  nuance: string;
  fournisseur: string;
  numeroCoulee: string;
  numeroLot: string | null;
  ccpuDocumentUrl: string | null;
  certificatUrl: string | null;
};

// Retrouve une matière déjà réceptionnée à partir du seul numéro lisible
// sur l'étiquette (coulée ou lot — voir GET /api/matieres?recherche=...) :
// l'intervenant qui prend une matière sur le chantier n'a besoin de
// connaître que ce numéro, pas de chercher dans une liste. Le CCPU et le
// certificat déjà déposés à la réception (voir AjouterMatiere) sont
// affichés directement avec le résultat.
export function RechercherMatiere({
  affaireId,
  onTrouvee,
}: {
  affaireId: string;
  onTrouvee: (matiereId: string) => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<MatiereTrouvee[] | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function rechercher() {
    if (!recherche.trim()) {
      setResultats(null);
      return;
    }
    setEnCours(true);
    const res = await fetch(`/api/matieres?affaireId=${affaireId}&recherche=${encodeURIComponent(recherche)}`);
    setEnCours(false);
    setResultats(res.ok ? await res.json() : []);
  }

  return (
    <div style={{ fontSize: "0.85rem" }}>
      <label>
        Retrouver une matière (numéro de coulée ou de lot lu sur l&apos;étiquette)
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), rechercher())}
            placeholder="ex. C123456"
            style={{ flex: 1, padding: "0.4rem" }}
          />
          <button type="button" onClick={rechercher} disabled={enCours}>
            {enCours ? "..." : "Rechercher"}
          </button>
        </div>
      </label>
      {resultats && (
        <div style={{ marginTop: "0.3rem" }}>
          {resultats.length === 0 ? (
            <p style={{ color: "#898781", margin: 0 }}>Aucune matière avec ce numéro sur cette affaire.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {resultats.map((m) => (
                <li key={m.id} style={{ border: "1px solid #ddd", padding: "0.4rem", marginBottom: "0.3rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      onTrouvee(m.id);
                      setResultats(null);
                      setRecherche("");
                    }}
                  >
                    Utiliser cette matière
                  </button>{" "}
                  {m.designation} ({m.nuance}) — {m.fournisseur} — coulée {m.numeroCoulee}
                  {m.numeroLot && `, lot ${m.numeroLot}`}
                  {m.ccpuDocumentUrl && (
                    <>
                      {" — "}
                      <a href={m.ccpuDocumentUrl} target="_blank" rel="noopener noreferrer">
                        CCPU
                      </a>
                    </>
                  )}
                  {m.certificatUrl && (
                    <>
                      {" — "}
                      <a href={m.certificatUrl} target="_blank" rel="noopener noreferrer">
                        certificat
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
