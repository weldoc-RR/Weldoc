"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";
import { LectureAutomatique } from "@/components/lecture-automatique";

type Personnel = { id: string; nom: string; prenom: string };

// Enregistre une habilitation (voir POST /api/habilitations). Un
// renouvellement se fait en créant un nouvel enregistrement, jamais en
// modifiant le précédent : l'historique complet reste consultable sur la
// fiche de la personne.
export function AjouterHabilitation({ personnel }: { personnel: Personnel[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [intitule, setIntitule] = useState("");
  const [reference, setReference] = useState("");
  const [dateObtention, setDateObtention] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [certificatUrl, setCertificatUrl] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Enregistrer une habilitation
      </button>
    );
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/habilitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personnelId,
        intitule,
        reference: reference || undefined,
        dateObtention: new Date(dateObtention).toISOString(),
        dateExpiration: dateExpiration ? new Date(dateExpiration).toISOString() : undefined,
        certificatUrl: certificatUrl || undefined,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer cette habilitation.");
      return;
    }
    setIntitule("");
    setReference("");
    setDateObtention("");
    setDateExpiration("");
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
        Intitulé (ex. habilitation électrique B0, travail en hauteur...)
        <input required type="text" value={intitule} onChange={(e) => setIntitule(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Référence du certificat (optionnel)
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date d&apos;obtention
        <input required type="date" value={dateObtention} onChange={(e) => setDateObtention(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date d&apos;expiration (optionnel)
        <input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le certificat (optionnel)
        <input type="text" value={certificatUrl} onChange={(e) => setCertificatUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <FileUpload onDepose={setCertificatUrl} />
      <LectureAutomatique
        documentUrl={certificatUrl}
        type="HABILITATION"
        onLu={(champs) => {
          if (champs.intitule) setIntitule(champs.intitule);
          if (champs.reference) setReference(champs.reference);
          if (champs.dateObtention) setDateObtention(champs.dateObtention);
          if (champs.dateExpiration) setDateExpiration(champs.dateExpiration);
        }}
      />
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
