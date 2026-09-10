// Petit badge de statut par type de contrôle (DIM/VT/PT/MT/RT/UT) : couleur
// = résultat du contrôle le plus récent de ce type sur le joint. Le texte
// (sigle + résultat) porte toujours l'information, jamais la couleur seule.
const COULEUR_CONFORME = "var(--couleur-conforme)";
const COULEUR_A_VERIFIER = "var(--couleur-a-verifier)";
const COULEUR_NON_CONFORME = "var(--couleur-non-conforme)";

function couleurResultat(resultat: string): string {
  if (resultat === "CONFORME") return COULEUR_CONFORME;
  if (resultat === "A_VERIFIER") return COULEUR_A_VERIFIER;
  return COULEUR_NON_CONFORME; // NON_CONFORME ou HORS_TOLERANCE
}

export function BadgeControle({ sigle, dernierResultat }: { sigle: string; dernierResultat: string | null }) {
  if (!dernierResultat) {
    return (
      <span style={{ fontSize: "0.85rem", color: "var(--couleur-texte-discret)", border: "1px solid var(--couleur-fond-discret)", borderRadius: 5, padding: "0.25rem 0.5rem" }}>
        {sigle}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: "0.85rem",
        color: "#fff",
        background: couleurResultat(dernierResultat),
        borderRadius: 5,
        padding: "0.25rem 0.5rem",
        fontWeight: "bold",
      }}
    >
      {sigle}
    </span>
  );
}
