"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IsoCanvas, type IsoTrait } from "@/app/joints/iso-canvas";

// Annotation graphique d'une photo (voir le cahier des charges, "BOOK
// PHOTO" : "annotables") — réutilise le même mécanisme de dessin au
// stylet que l'ISO manuel du TQC (src/app/joints/iso-canvas.tsx), avec la
// photo elle-même comme fond. Enregistré à chaque trait, comme les autres
// zones "à cocher/dessiner" de l'application — pas de bouton "Enregistrer"
// séparé.
export function AnnoterPhoto({ photoId, url, annotations }: { photoId: string; url: string; annotations: IsoTrait[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [traits, setTraits] = useState<IsoTrait[]>(annotations);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(nouveauxTraits: IsoTrait[]) {
    setTraits(nouveauxTraits);
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annotations: nouveauxTraits }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer l'annotation.");
      return;
    }
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} style={{ fontSize: "0.75rem" }}>
        {annotations.length > 0 ? "Modifier l'annotation" : "Annoter"}
      </button>
    );
  }

  return (
    <div style={{ marginTop: "0.4rem" }}>
      <IsoCanvas fondUrl={url} traits={traits} onChange={enregistrer} />
      {enCours && <p style={{ fontSize: "0.75rem", color: "#898781", margin: "0.2rem 0 0 0" }}>Enregistrement...</p>}
      {erreur && <p style={{ fontSize: "0.75rem", color: "crimson", margin: "0.2rem 0 0 0" }}>{erreur}</p>}
      <button type="button" onClick={() => setOuvert(false)} style={{ fontSize: "0.75rem", marginTop: "0.3rem" }}>
        Fermer
      </button>
    </div>
  );
}
