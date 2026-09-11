"use client";

import { useState } from "react";
import { RedigerRex } from "./rediger-rex";

// Bascule entre le bouton "+ Rédiger une fiche REX" et le formulaire, pour
// une FNC donnée.
export function OuvrirRedactionRex({ fncId }: { fncId: string }) {
  const [ouvert, setOuvert] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ fontSize: "0.8rem" }}>
        + Rédiger une fiche REX
      </button>
    );
  }

  return <RedigerRex fncId={fncId} onTermine={() => setOuvert(false)} />;
}
