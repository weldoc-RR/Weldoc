"use client";

import { useState } from "react";
import { ControleGeneriqueForm } from "./controle-generique-form";
import { ControleRessuageForm } from "./controle-ressuage-form";
import { ControleCndConsommablesForm } from "./controle-cnd-consommables-form";
import { ControleDimensionnelForm } from "./controle-dimensionnel-form";

type ControleVisuel = { id: string; procedureRef: string; dateControle: string };
type Consommable = { id: string; type: string; fabricant: string; reference: string; lot: string };
type Outil = { id: string; reference: string; type: string };

type TypeFormulaireOuvert = "DIM" | "VT" | "PT" | "MT" | "RT" | "UT" | null;

// Chaque méthode ne propose que les types de consommables qui la
// concernent (voir TypeConsommableCND) — "AUTRE" reste toujours proposé.
const TYPES_PAR_METHODE: Record<"PT" | "MT" | "RT" | "UT", string[]> = {
  PT: ["PENETRANT", "REVELATEUR", "NETTOYANT", "AUTRE"],
  MT: ["POUDRE_MAGNETIQUE", "PRODUIT_CONTRASTE", "DEMAGNETISANT", "NETTOYANT", "AUTRE"],
  RT: ["FILM_RADIOGRAPHIQUE", "PRODUIT_DEVELOPPEMENT", "AUTRE"],
  UT: ["COUPLANT", "AUTRE"],
};

// Barre de boutons "+ VT", "+ Dimensionnel"... sous un joint, qui ouvre le
// formulaire de saisie correspondant. Un seul formulaire ouvert à la fois
// pour rester lisible.
export function ControlesJoint({
  jointId,
  controlesVisuels,
  consommables,
  outils,
}: {
  jointId: string;
  controlesVisuels: ControleVisuel[];
  consommables: Consommable[];
  outils: Outil[];
}) {
  const [ouvert, setOuvert] = useState<TypeFormulaireOuvert>(null);

  const fermer = () => setOuvert(null);

  return (
    <div style={{ marginTop: "0.3rem" }}>
      <span style={{ fontSize: "0.8rem", color: "#52514e" }}>Ajouter un contrôle :</span>{" "}
      {(["DIM", "VT", "PT", "MT", "RT", "UT"] as const).map((type) => (
        <button key={type} onClick={() => setOuvert(type)} style={{ fontSize: "0.8rem", marginRight: "0.2rem" }}>
          + {type}
        </button>
      ))}
      {ouvert === "DIM" && <ControleDimensionnelForm jointId={jointId} outils={outils} onCree={fermer} onAnnuler={fermer} />}
      {ouvert === "VT" && (
        <ControleGeneriqueForm endpoint="/api/controles-visuels" jointId={jointId} onCree={fermer} onAnnuler={fermer} />
      )}
      {ouvert === "PT" && (
        <ControleRessuageForm
          jointId={jointId}
          controlesVisuels={controlesVisuels}
          consommables={consommables.filter((c) => TYPES_PAR_METHODE.PT.includes(c.type))}
          onCree={fermer}
          onAnnuler={fermer}
        />
      )}
      {ouvert === "MT" && (
        <ControleCndConsommablesForm
          endpoint="/api/controles-magnetoscopie"
          jointId={jointId}
          consommables={consommables.filter((c) => TYPES_PAR_METHODE.MT.includes(c.type))}
          outils={outils}
          onCree={fermer}
          onAnnuler={fermer}
        />
      )}
      {ouvert === "RT" && (
        <ControleCndConsommablesForm
          endpoint="/api/controles-radiographie"
          jointId={jointId}
          consommables={consommables.filter((c) => TYPES_PAR_METHODE.RT.includes(c.type))}
          outils={outils}
          onCree={fermer}
          onAnnuler={fermer}
        />
      )}
      {ouvert === "UT" && (
        <ControleCndConsommablesForm
          endpoint="/api/controles-ultrasons"
          jointId={jointId}
          consommables={consommables.filter((c) => TYPES_PAR_METHODE.UT.includes(c.type))}
          outils={outils}
          onCree={fermer}
          onAnnuler={fermer}
        />
      )}
    </div>
  );
}
