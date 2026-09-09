"use client";

import { useEffect, useRef, useState } from "react";

export type Point = { x: number; y: number };
export type IsoTrait = { points: Point[]; couleur: string; epaisseur: number };

const COULEURS = [
  { valeur: "#10161d", label: "Trait" },
  { valeur: "#d03b3b", label: "Écart" },
];
const EPAISSEURS = [
  { valeur: 2, label: "Fin" },
  { valeur: 4, label: "Moyen" },
  { valeur: 7, label: "Épais" },
];

const LARGEUR = 640;
const HAUTEUR = 400;

function dessiner(
  ctx: CanvasRenderingContext2D,
  fond: HTMLImageElement | null,
  traits: IsoTrait[],
  traitEnCours: IsoTrait | null
) {
  ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  if (fond) {
    ctx.drawImage(fond, 0, 0, LARGEUR, HAUTEUR);
  }
  for (const trait of traitEnCours ? [...traits, traitEnCours] : traits) {
    if (trait.points.length < 2) continue;
    ctx.strokeStyle = trait.couleur;
    ctx.lineWidth = trait.epaisseur;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(trait.points[0].x * LARGEUR, trait.points[0].y * HAUTEUR);
    for (const p of trait.points.slice(1)) {
      ctx.lineTo(p.x * LARGEUR, p.y * HAUTEUR);
    }
    ctx.stroke();
  }
}

// Zone de dessin de l'ISO manuel (voir le cahier des charges, "TQC (TEL
// QUE CONSTRUIT)" : "ISO manuel sur tablette (stylet)"). Fonctionne au
// stylet, au doigt ou à la souris via les événements pointer du
// navigateur — pas de matériel ni de bibliothèque spécifique nécessaire.
// Les traits sont stockés en coordonnées relatives (0..1) pour rester
// justes quel que soit l'écran sur lequel ils sont redessinés ensuite.
// `onChange` absent = lecture seule (TQC déjà signé).
export function IsoCanvas({
  fondUrl,
  traits,
  onChange,
}: {
  fondUrl: string | null;
  traits: IsoTrait[];
  onChange?: (traits: IsoTrait[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fondRef = useRef<HTMLImageElement | null>(null);
  const [traitEnCours, setTraitEnCours] = useState<IsoTrait | null>(null);
  const [couleur, setCouleur] = useState(COULEURS[0].valeur);
  const [epaisseur, setEpaisseur] = useState(EPAISSEURS[1].valeur);
  const [fondCharge, setFondCharge] = useState(0);

  const lectureSeuleUniquement = !onChange;

  useEffect(() => {
    if (!fondUrl) {
      fondRef.current = null;
      setFondCharge((n) => n + 1);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      fondRef.current = img;
      setFondCharge((n) => n + 1);
    };
    img.onerror = () => {
      fondRef.current = null;
      setFondCharge((n) => n + 1);
    };
    img.src = fondUrl;
  }, [fondUrl]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    dessiner(ctx, fondRef.current, traits, traitEnCours);
  }, [traits, traitEnCours, fondCharge]);

  function positionRelative(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  function debuterTrait(e: React.PointerEvent<HTMLCanvasElement>) {
    if (lectureSeuleUniquement) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTraitEnCours({ points: [positionRelative(e)], couleur, epaisseur });
  }

  function continuerTrait(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!traitEnCours) return;
    setTraitEnCours({ ...traitEnCours, points: [...traitEnCours.points, positionRelative(e)] });
  }

  function terminerTrait() {
    if (!traitEnCours || !onChange) {
      setTraitEnCours(null);
      return;
    }
    if (traitEnCours.points.length >= 2) {
      onChange([...traits, traitEnCours]);
    }
    setTraitEnCours(null);
  }

  return (
    <div>
      {!lectureSeuleUniquement && (
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.4rem", fontSize: "0.8rem" }}>
          <span>Couleur :</span>
          {COULEURS.map((c) => (
            <button
              type="button"
              key={c.valeur}
              onClick={() => setCouleur(c.valeur)}
              style={{
                border: couleur === c.valeur ? "2px solid #333" : "1px solid #ccc",
                background: c.valeur,
                color: "#fff",
                borderRadius: 4,
                padding: "0.15rem 0.5rem",
              }}
            >
              {c.label}
            </button>
          ))}
          <span style={{ marginLeft: "0.6rem" }}>Épaisseur :</span>
          <select value={epaisseur} onChange={(e) => setEpaisseur(Number(e.target.value))} style={{ padding: "0.2rem" }}>
            {EPAISSEURS.map((e) => (
              <option key={e.valeur} value={e.valeur}>
                {e.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange?.(traits.slice(0, -1))}
            disabled={traits.length === 0}
            style={{ marginLeft: "0.6rem" }}
          >
            Annuler le dernier trait
          </button>
          <button type="button" onClick={() => onChange?.([])} disabled={traits.length === 0}>
            Tout effacer
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={LARGEUR}
        height={HAUTEUR}
        onPointerDown={debuterTrait}
        onPointerMove={continuerTrait}
        onPointerUp={terminerTrait}
        onPointerCancel={terminerTrait}
        style={{
          width: "100%",
          maxWidth: LARGEUR,
          height: "auto",
          touchAction: "none",
          border: "1px solid #ccc",
          borderRadius: 4,
          cursor: lectureSeuleUniquement ? "default" : "crosshair",
          display: "block",
        }}
      />
    </div>
  );
}
