"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AjouterQmos() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [version, setVersion] = useState("Rev 0");
  const [procede, setProcede] = useState("");
  const [normeReference, setNormeReference] = useState("");
  const [laboratoire, setLaboratoire] = useState("");
  const [certificatUrl, setCertificatUrl] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/qmos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        version,
        procede,
        normeReference,
        laboratoire: laboratoire || undefined,
        certificatUrl: certificatUrl || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible de créer cette QMOS (référence + version déjà utilisées ?).");
      return;
    }
    setReference("");
    setVersion("Rev 0");
    setProcede("");
    setNormeReference("");
    setLaboratoire("");
    setCertificatUrl("");
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480 }}>
      <label>
        Référence (ex. QMOS-001)
        <input required type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Version
        <input required type="text" value={version} onChange={(e) => setVersion(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Procédé (ex. 141 / TIG)
        <input required type="text" value={procede} onChange={(e) => setProcede(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Norme de référence (ex. EN ISO 15614-1)
        <input required type="text" value={normeReference} onChange={(e) => setNormeReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Laboratoire (optionnel)
        <input type="text" value={laboratoire} onChange={(e) => setLaboratoire(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le certificat (optionnel)
        <input type="text" value={certificatUrl} onChange={(e) => setCertificatUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <button type="submit" disabled={enCours}>
        {enCours ? "Création..." : "Créer la QMOS"}
      </button>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
