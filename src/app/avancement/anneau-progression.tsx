// Anneau de progression (SVG) : version "ronde" du pourcentage global
// d'avancement d'une affaire, en complément de la barre de séquence
// (barre-sequence.tsx) qui reste, elle, linéaire par séquence. Couleur
// bleu acier de marque (--couleur-primaire) plutôt qu'une couleur de
// statut réglementaire (vert/rouge/ambre) : un pourcentage d'avancement
// n'est pas un verdict de conformité — même principe que la barre "joints
// soudés/prévus" déjà en place.
export function AnneauProgression({ pourcentage, taille = 132, epaisseur = 12 }: { pourcentage: number; taille?: number; epaisseur?: number }) {
  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const rempli = (Math.min(100, Math.max(0, pourcentage)) / 100) * circonference;

  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} role="img" aria-label={`${pourcentage}% d'avancement global`}>
      <circle
        cx={taille / 2}
        cy={taille / 2}
        r={rayon}
        fill="none"
        stroke="var(--couleur-fond-discret)"
        strokeWidth={epaisseur}
      />
      <circle
        cx={taille / 2}
        cy={taille / 2}
        r={rayon}
        fill="none"
        stroke="var(--couleur-primaire)"
        strokeWidth={epaisseur}
        strokeLinecap="round"
        strokeDasharray={`${rempli} ${circonference}`}
        transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
        style={{ transition: "stroke-dasharray 0.4s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={taille * 0.22}
        fontWeight="bold"
        fontFamily="var(--font-titres)"
        fill="var(--couleur-texte)"
      >
        {pourcentage}%
      </text>
    </svg>
  );
}
