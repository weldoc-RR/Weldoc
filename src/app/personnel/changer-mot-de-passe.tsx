"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Change le mot de passe d'un compte (voir POST /api/auth/comptes/[id]/
// mot-de-passe) : soi-même (mot de passe actuel requis, redirige vers
// /login ensuite puisque toutes les sessions du compte, y compris celle-
// ci, sont révoquées), ou une personne de niveau 3 en cas d'oubli (pas de
// mot de passe actuel à fournir).
export function ChangerMotDePasse({ compteId, estSoiMeme }: { compteId: string; estSoiMeme: boolean }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>
        {estSoiMeme ? "Changer mon mot de passe" : "Réinitialiser le mot de passe"}
      </button>
    );
  }

  async function changer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const res = await fetch(`/api/auth/comptes/${compteId}/mot-de-passe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motDePasseActuel: estSoiMeme ? motDePasseActuel : undefined, nouveauMotDePasse }),
    });
    setEnCours(false);
    if (!res.ok) {
      const corps = await res.json().catch(() => null);
      setErreur(corps?.error ?? "Impossible de changer ce mot de passe.");
      return;
    }
    if (estSoiMeme) {
      router.push("/login");
      return;
    }
    setMotDePasseActuel("");
    setNouveauMotDePasse("");
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={changer} style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center", marginLeft: "0.5rem", flexWrap: "wrap" }}>
      {estSoiMeme && (
        <input
          required
          type="password"
          placeholder="Mot de passe actuel"
          value={motDePasseActuel}
          onChange={(e) => setMotDePasseActuel(e.target.value)}
          style={{ fontSize: "0.85rem", width: 160 }}
        />
      )}
      <input
        required
        type="password"
        placeholder="Nouveau mot de passe (8+ car.)"
        value={nouveauMotDePasse}
        onChange={(e) => setNouveauMotDePasse(e.target.value)}
        style={{ fontSize: "0.85rem", width: 180 }}
      />
      <button type="submit" disabled={enCours}>
        {enCours ? "..." : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setOuvert(false)}>
        Annuler
      </button>
      {erreur && <span style={{ color: "var(--couleur-non-conforme)", fontSize: "0.8rem" }}>{erreur}</span>}
      {estSoiMeme && (
        <span style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)" }}>Vous serez déconnecté(e) ensuite.</span>
      )}
    </form>
  );
}
