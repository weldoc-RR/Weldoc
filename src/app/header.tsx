import Link from "next/link";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { LIBELLE_NIVEAU } from "@/lib/niveaux";
import { HeaderNav } from "./header-nav";
import { LogoutButton } from "./logout-button";

// En-tête commun à toute l'application (voir layout.tsx) : jusqu'ici,
// seule la page d'accueil affichait qui est connecté et un bouton de
// déconnexion — nulle part ailleurs on ne pouvait se déconnecter sans
// repasser par "/" d'abord. Rendu une seule fois ici, présent sur toute
// page authentifiée. N'affiche rien sur une page non authentifiée (ex.
// /login) : ce composant vérifie lui-même la session, indépendamment du
// contrôle d'accès (redirect) que chaque page fait déjà pour ses propres
// données.
export async function Header() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) return null;

  return (
    <header
      style={{
        background: "var(--couleur-primaire-sombre)",
        color: "#fff",
        padding: "0.6rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.6rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <Link
          href="/"
          style={{
            color: "#fff",
            textDecoration: "none",
            fontFamily: "var(--font-titres)",
            fontWeight: 800,
            fontSize: "1.15rem",
            letterSpacing: "0.02em",
          }}
        >
          WELDOC
        </Link>
        <HeaderNav />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
        <span style={{ color: "rgba(255,255,255,0.85)" }}>
          {utilisateur.prenom} {utilisateur.nom} · {LIBELLE_NIVEAU[utilisateur.niveau]}
        </span>
        <LogoutButton style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} />
      </div>
    </header>
  );
}
