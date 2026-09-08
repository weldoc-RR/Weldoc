"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Destinataire = { id: string; email: string; actif: boolean };

export function Destinataires({ initiaux }: { initiaux: Destinataire[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/destinataires-alertes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'ajouter cette adresse.");
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function retirer(id: string) {
    await fetch(`/api/destinataires-alertes/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const actifs = initiaux.filter((d) => d.actif);

  return (
    <div>
      <h2>Destinataires du récapitulatif hebdomadaire</h2>
      <p>Chaque lundi, un résumé des alertes outillage est envoyé aux adresses ci-dessous.</p>
      {actifs.length === 0 ? (
        <p>Aucune adresse enregistrée pour l'instant.</p>
      ) : (
        <ul>
          {actifs.map((d) => (
            <li key={d.id}>
              {d.email}{" "}
              <button onClick={() => retirer(d.id)} style={{ marginLeft: "0.5rem" }}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={ajouter} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="adresse@exemple.fr"
          required
          style={{ padding: "0.4rem" }}
        />
        <button type="submit" disabled={enCours}>
          {enCours ? "Ajout..." : "Ajouter"}
        </button>
      </form>
      {erreur && <p style={{ color: "crimson" }}>{erreur}</p>}
    </div>
  );
}
