import type { AvancementSequence } from "@/lib/avancement";

// Couleurs de statut (jamais réutilisées pour autre chose qu'un état) :
// terminée = vert, en cours = orange, à faire = gris neutre. Une phase
// "non applicable" (ex. justifiée sans objet pour cette affaire) est
// affichée à part, hachurée, et exclue du calcul du pourcentage.
const COULEUR_TERMINEE = "var(--couleur-conforme)";
const COULEUR_EN_COURS = "var(--couleur-a-verifier)";
const COULEUR_A_FAIRE = "var(--couleur-texte-discret)";
const COULEUR_NON_APPLICABLE = "var(--couleur-fond-discret)";

const LARGEUR = 320;
const HAUTEUR = 14;

export function BarreSequence({ avancement }: { avancement: AvancementSequence }) {
  const { totalPhases, terminees, enCours, aFaire, nonApplicables } = avancement;
  if (totalPhases === 0) {
    return <span style={{ color: "var(--couleur-texte-discret)" }}>Aucune phase.</span>;
  }

  const segments = [
    { valeur: terminees, couleur: COULEUR_TERMINEE, label: "terminée(s)" },
    { valeur: enCours, couleur: COULEUR_EN_COURS, label: "en cours" },
    { valeur: aFaire, couleur: COULEUR_A_FAIRE, label: "à faire" },
    { valeur: nonApplicables, couleur: COULEUR_NON_APPLICABLE, label: "non applicable(s)" },
  ].filter((s) => s.valeur > 0);

  let x = 0;
  const gap = 2;
  const rects = segments.map((s, i) => {
    const largeur = (s.valeur / totalPhases) * LARGEUR - (segments.length > 1 ? gap : 0);
    const rect = (
      <rect
        key={i}
        x={x}
        y={0}
        width={Math.max(largeur, 0)}
        height={HAUTEUR}
        rx={4}
        fill={s.couleur}
        stroke={s.couleur === COULEUR_NON_APPLICABLE ? "var(--couleur-texte-discret)" : "none"}
        strokeWidth={s.couleur === COULEUR_NON_APPLICABLE ? 1 : 0}
      />
    );
    x += largeur + gap;
    return rect;
  });

  return (
    <svg width={LARGEUR} height={HAUTEUR} role="img" aria-label={`${avancement.pourcentage}% de phases terminées`}>
      {rects}
    </svg>
  );
}

export function LegendeStatutsPhase() {
  const items: [string, string][] = [
    [COULEUR_TERMINEE, "Terminée"],
    [COULEUR_EN_COURS, "En cours"],
    [COULEUR_A_FAIRE, "À faire"],
    [COULEUR_NON_APPLICABLE, "Non applicable"],
  ];
  return (
    <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", marginTop: "0.5rem" }}>
      {items.map(([couleur, label]) => (
        <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <span
            style={{ width: 10, height: 10, borderRadius: 3, background: couleur, display: "inline-block" }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
