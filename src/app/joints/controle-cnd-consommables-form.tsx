"use client";

import { useState } from "react";
import { ControleGeneriqueForm } from "./controle-generique-form";
import { EditeurConsommables } from "./editeur-consommables";

type Consommable = { id: string; type: string; fabricant: string; reference: string; lot: string };

// MT/RT/UT : même formulaire que le contrôle visuel (voir
// controle-generique-form.tsx), avec en plus le choix des consommables
// utilisés (poudre magnétique, film, couplant...) — même bibliothèque et
// même principe que le ressuage (controle-ressuage-form.tsx), mais sans
// contrôle visuel préalable obligatoire (spécifique au ressuage).
export function ControleCndConsommablesForm({
  endpoint,
  jointId,
  consommables,
  onCree,
  onAnnuler,
}: {
  endpoint: string;
  jointId: string;
  consommables: Consommable[];
  onCree: () => void;
  onAnnuler: () => void;
}) {
  const [consommableIds, setConsommableIds] = useState<string[]>([]);

  return (
    <ControleGeneriqueForm
      endpoint={endpoint}
      jointId={jointId}
      onCree={onCree}
      onAnnuler={onAnnuler}
      extraJson={() => ({ consommableIds })}
      extra={<EditeurConsommables consommables={consommables} selectionnes={consommableIds} onChange={setConsommableIds} />}
    />
  );
}
