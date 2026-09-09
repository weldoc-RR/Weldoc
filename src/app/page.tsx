import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerAvancementAffaire } from "@/lib/avancement";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affaires = await prisma.affaire.findMany({
    include: { joints: true, fncs: true },
    orderBy: { createdAt: "desc" },
  });
  // État d'avancement affiché directement sur chaque affaire (et pas
  // seulement sur la page dédiée /avancement) : même calcul, à la lecture,
  // rien n'est stocké — voir src/lib/avancement.ts.
  const avancements = await Promise.all(
    affaires.map(async (a) => ({ affaireId: a.id, avancement: await calculerAvancementAffaire(a.id) }))
  );
  const avancementParAffaire = new Map(avancements.map((a) => [a.affaireId, a.avancement]));

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Weldoc — Affaires</h1>
        <div style={{ textAlign: "right" }}>
          <p>
            Connecté : {utilisateur.prenom} {utilisateur.nom} ({utilisateur.niveau})
          </p>
          <LogoutButton />
        </div>
      </div>
      <p>
        Squelette de démonstration : liste des affaires, joints et FNC. <Link href="/personnel">Personnel →</Link>{" "}
        <Link href="/joints">Joints →</Link> <Link href="/procedures">WPS/QMOS →</Link>{" "}
        <Link href="/consommables">Consommables CND →</Link>{" "}
        <Link href="/alertes">Alertes →</Link> <Link href="/pieces">Pièces (atelier) →</Link>{" "}
        <Link href="/avancement">Avancement →</Link> <Link href="/charte">Charte →</Link>
      </p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {affaires.map((a) => {
          const avancement = avancementParAffaire.get(a.id);
          return (
            <li key={a.id} style={{ marginBottom: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.75rem" }}>
              <strong>{a.numero}</strong> — {a.client} / {a.projet} ({a.typeRealisation.toLowerCase()}) —{" "}
              {a.joints.length} joint(s), {a.fncs.length} FNC —{" "}
              <Link href={`/affaires/${a.id}/dossier`}>Rapport de fin de fabrication →</Link>{" "}
              · <Link href={`/affaires/${a.id}/photos`}>Book photo →</Link>{" "}
              · <Link href={`/affaires/${a.id}/reglementaire`}>Dossier réglementaire →</Link>{" "}
              · <Link href={`/affaires/${a.id}/planning`}>Planning →</Link>
              {avancement && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.35rem" }}>
                  <div style={{ width: 200, height: 8, background: "#e1e0d9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${avancement.pourcentageGlobal}%`, height: "100%", background: "#0ca30c" }} />
                  </div>
                  <span style={{ fontSize: "0.85rem" }}>
                    <Link href={`/avancement/${a.id}`}>{avancement.pourcentageGlobal}% d&apos;avancement</Link>
                  </span>
                  {avancement.fnc.ouvertes > 0 && (
                    <span style={{ fontSize: "0.85rem", color: "#d03b3b" }}>{avancement.fnc.ouvertes} FNC ouverte(s)</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
