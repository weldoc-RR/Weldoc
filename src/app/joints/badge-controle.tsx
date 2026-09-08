// Petit badge de statut par type de contrôle (DIM/VT/PT/MT/RT/UT) : couleur
// = résultat du contrôle le plus récent de ce type sur le joint. Le texte
// (sigle + résultat) porte toujours l'information, jamais la couleur seule.
const COULEUR_CONFORME = "#0ca30c";
const COULEUR_A_VERIFIER = "#fab219";
const COULEUR_NON_CONFORME = "#d03b3b";

function couleurResultat(resultat: string): string {
  if (resultat === "CONFORME") return COULEUR_CONFORME;
  if (resultat === "A_VERIFIER") return COULEUR_A_VERIFIER;
  return COULEUR_NON_CONFORME; // NON_CONFORME ou HORS_TOLERANCE
}

export function BadgeControle({ sigle, dernierResultat }: { sigle: string; dernierResultat: string | null }) {
  if (!dernierResultat) {
    return (
      <span style={{ fontSize: "0.75rem", color: "#c3c2b7", border: "1px solid #e1e0d9", borderRadius: 4, padding: "0.1rem 0.4rem" }}>
        {sigle}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: "0.75rem",
        color: "#fff",
        background: couleurResultat(dernierResultat),
        borderRadius: 4,
        padding: "0.1rem 0.4rem",
        fontWeight: "bold",
      }}
    >
      {sigle}
    </span>
  );
}
