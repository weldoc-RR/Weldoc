"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Rédige la fiche REX d'une FNC (voir POST /api/rex) : type de problème,
// origine, cause, solution, résultat. Le matériau/procédé/fournisseur/
// type de joint/chantier ne sont jamais redemandés ici — ils se lisent
// déjà sur le joint et l'affaire de la FNC.
export function RedigerRex({ fncId, onTermine }: { fncId: string; onTermine: () => void }) {
  const router = useRouter();
  const [typeProbleme, setTypeProbleme] = useState("");
  const [origine, setOrigine] = useState("");
  const [cause, setCause] = useState("");
  const [solution, setSolution] = useState("");
  const [resultat, setResultat] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch("/api/rex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fncId,
        typeProbleme,
        origine: origine || undefined,
        cause,
        solution,
        resultat: resultat || undefined,
      }),
    });
    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette fiche REX.");
      return;
    }
    router.refresh();
    onTermine();
  }

  return (
    <form onSubmit={enregistrer} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: 520, marginTop: "0.5rem", border: "1px solid #ddd", padding: "0.75rem" }}>
      <label style={{ fontSize: "0.85rem" }}>
        Type de problème (ex. défaut de soudage, non-conformité dimensionnelle, problème de procédure...)
        <input required type="text" value={typeProbleme} onChange={(e) => setTypeProbleme(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Origine (ex. matière première, erreur opérateur, procédé inadapté...) — optionnel
        <input type="text" value={origine} onChange={(e) => setOrigine(e.target.value)} style={{ display: "block", width: "100%", padding: "0.3rem" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Cause
        <textarea required value={cause} onChange={(e) => setCause(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.3rem", fontFamily: "inherit" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Solution mise en œuvre
        <textarea required value={solution} onChange={(e) => setSolution(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.3rem", fontFamily: "inherit" }} />
      </label>
      <label style={{ fontSize: "0.85rem" }}>
        Résultat observé (optionnel — peut se compléter plus tard, une fois l&apos;efficacité vérifiée)
        <textarea value={resultat} onChange={(e) => setResultat(e.target.value)} rows={2} style={{ display: "block", width: "100%", padding: "0.3rem", fontFamily: "inherit" }} />
      </label>
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer la fiche REX"}
        </button>
        <button type="button" onClick={onTermine} style={{ marginLeft: "0.4rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
