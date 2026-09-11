"use client";

// Pas de génération de PDF côté serveur pour l'instant (ajouterait une
// dépendance à choisir avec vous) : l'impression du navigateur (Ctrl+P →
// "Enregistrer en PDF") suffit pour un premier export, la page étant mise
// en forme pour ça (voir le CSS d'impression dans page.tsx).
export function BoutonImprimer() {
  return (
    <button onClick={() => window.print()} className="no-print">
      Imprimer / exporter en PDF
    </button>
  );
}
