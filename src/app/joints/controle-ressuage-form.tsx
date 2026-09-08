"use client";

import { useState } from "react";
import { ControleGeneriqueForm } from "./controle-generique-form";

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

  function basculerConsommable(id: string) {
    setConsommableIds((actuels) => (actuels.includes(id) ? actuels.filter((c) => c !== id) : [...actuels, id]));
  }

  return (
    <ControleGeneriqueForm
      endpoint="/api/controles-ressuage"
      jointId={jointId}
      onCree={onCree}
      onAnnuler={onAnnuler}
      extraJson={() => (controleVisuelPrealableId ? { controleVisuelPrealableId, consommableIds } : null)}
      extra={
        <>
          <label style={{ fontSize: "0.85rem", display: "block" }}>
            Contrôle visuel préalable (obligatoire)
            <select
              required
              value={controleVisuelPrealableId}
              onChange={(e) => setControleVisuelPrealableId(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.3rem" }}
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
            <p style={{ fontSize: "0.8rem", color: "crimson" }}>
              Aucun contrôle visuel enregistré sur ce joint : il en faut un avant de pouvoir faire un ressuage.
            </p>
          )}
          {consommables.length > 0 && (
            <div style={{ fontSize: "0.85rem", marginTop: "0.3rem" }}>
              Consommables utilisés (optionnel) :
              <ul style={{ listStyle: "none", padding: 0, maxHeight: 100, overflowY: "auto" }}>
                {consommables.map((c) => (
                  <li key={c.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={consommableIds.includes(c.id)}
                        onChange={() => basculerConsommable(c.id)}
                      />{" "}
                      {c.type} — {c.fabricant} {c.reference} (lot {c.lot})
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      }
    />
  );
}
