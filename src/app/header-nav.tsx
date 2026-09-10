"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", label: "Affaires" },
  { href: "/joints", label: "Joints" },
  { href: "/personnel", label: "Personnel" },
  { href: "/planning", label: "Planning" },
  { href: "/alertes", label: "Alertes" },
];

// Barre de navigation principale (voir header.tsx) : les cinq écrans les
// plus utilisés au quotidien, mis en avant plutôt que la liste complète
// des ~50 modules du cahier des charges — les autres restent accessibles
// depuis la page d'accueil. Lien actif mis en évidence par comparaison de
// l'URL courante (usePathname, d'où le "use client" : l'en-tête lui-même
// reste un composant serveur, seule cette barre a besoin du chemin
// courant côté navigateur).
export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
      {LIENS.map((lien) => {
        const actif = lien.href === "/" ? pathname === "/" : pathname.startsWith(lien.href);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            style={{
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: actif ? 600 : 400,
              padding: "0.4rem 0.7rem",
              borderRadius: 6,
              background: actif ? "rgba(255,255,255,0.16)" : "transparent",
            }}
          >
            {lien.label}
          </Link>
        );
      })}
    </nav>
  );
}
