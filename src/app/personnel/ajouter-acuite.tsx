"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";

type Personnel = { id: string; nom: string; prenom: string };

// Enregistre un test d'acuité visuelle (voir POST /api/acuites-visuelles).
// Un nouveau test est un nouvel enregistrement, jamais une modification du
// précédent : l'historique complet reste consultable sur la fiche de la
// personne.
export function AjouterAcuite({ personnel }: { personnel: Personnel[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [dateTest, setDateTest] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [apte, setApte] = useState(true);
  const [organisme, setOrganisme] = useState("");
  const [certificatUrl, setCertificatUrl] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Enregistrer un test d&apos;acuité visuelle
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/acuites-visuelles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId,
        dateTest: new Date(dateTest).toISOString(),
        dateExpiration: dateExpiration ? new Date(dateExpiration).toISOString() : undefined,
        apte,
        organisme: organisme || undefined,
        certificatUrl: certificatUrl || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer ce test.");
      return;
    }
    setDateTest("");
    setDateExpiration("");
    setApte(true);
    setOrganisme("");
    setCertificatUrl("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid #ddd", padding: "1rem" }}>
      <label>
        Personne
        <select value={personnelId} onChange={(e) => setPersonnelId(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }}>
          {personnel.map((p) => (
            <option key={p.id} value={p.id}>
              {p.prenom} {p.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date du test
        <input required type="date" value={dateTest} onChange={(e) => setDateTest(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date d&apos;expiration (optionnel)
        <input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        <input type="checkbox" checked={apte} onChange={(e) => setApte(e.target.checked)} /> Apte
      </label>
      <label>
        Organisme (optionnel)
        <input type="text" value={organisme} onChange={(e) => setOrganisme(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le certificat (optionnel)
        <input type="text" value={certificatUrl} onChange={(e) => setCertificatUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <FileUpload onDepose={setCertificatUrl} />
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </form>
  );
}
