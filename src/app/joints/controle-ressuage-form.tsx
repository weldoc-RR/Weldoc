"use client";

import { useState } from "react";
import { ControleGeneriqueForm } from "./controle-generique-form";
import { EditeurConsommables } from "./editeur-consommables";

type ControleVisuel = { id: string; procedureRef: string; dateControle: string };
type Consommable = { id: string; type: string; fabricant: string; reference: string; lot: string };

// Le contrôle visuel préalable est obligatoire (voir POST
// /api/controles-ressuage) : impossible de faire un ressuage sur un joint
// qui n'a pas encore été inspecté visuellement.
export function ControleRessuageForm({
  jointId,
  controlesVisuels,
  consommables,
  onCree,
  onAnnuler,
}: {
  jointId: string;
  controlesVisuels: ControleVisuel[];
  consommables: Consommable[];
  onCree: () => void;
  onAnnuler: () => void;
}) {
  const [controleVisuelPrealableId, setControleVisuelPrealableId] = useState("");
  const [consommableIds, setConsommableIds] = useState<string[]>([]);

  return (
    <ControleGeneriqueForm
      endpoint="/api/controles-ressuage"
      jointId={jointId}
      onCree={onCree}
      onAnnuler={onAnnuler}
      extraJson={() => (controleVisuelPrealableId ? { controleVisuelPrealableId, consommableIds } : null)}
      extra={
        <>
          <label style={{ fontSize: "0.95rem", display: "block", marginTop: "0.6rem" }}>
            Contrôle visuel préalable (obligatoire)
            <select
              required
              value={controleVisuelPrealableId}
              onChange={(e) => setControleVisuelPrealableId(e.target.value)}
              style={{ display: "block", width: "100%" }}
            >
              <option value="">— choisir —</option>
              {controlesVisuels.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.procedureRef} — {new Date(cv.dateControle).toLocaleDateString("fr-FR")}
                </option>
              ))}
            </select>
          </label>
          {controlesVisuels.length === 0 && (
            <p style={{ fontSize: "0.9rem", color: "crimson" }}>
              Aucun contrôle visuel enregistré sur ce joint : il en faut un avant de pouvoir faire un ressuage.
            </p>
          )}
          <EditeurConsommables consommables={consommables} selectionnes={consommableIds} onChange={setConsommableIds} />
        </>
      }
    />
  );
}
