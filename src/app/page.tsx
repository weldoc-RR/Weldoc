import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { calculerAvancementAffaire } from "@/lib/avancement";

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
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Affaires</h1>
      <p style={{ color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        Préparation, réalisation, contrôle et traçabilité des affaires — chaque affaire regroupe ses joints, son
        planning, son dossier réglementaire et son rapport de fin de fabrication.
      </p>
      <p style={{ fontSize: "0.85rem" }}>
        <Link href="/procedures">WPS/QMOS →</Link> · <Link href="/consommables">Consommables CND →</Link> ·{" "}
        <Link href="/pieces">Pièces (atelier) →</Link> · <Link href="/avancement">Avancement →</Link> ·{" "}
        <Link href="/charte">Charte →</Link> · <Link href="/documents">Documents externes →</Link> ·{" "}
        <Link href="/rex">REX →</Link> · <Link href="/productivite">Temps et productivité →</Link> ·{" "}
        <Link href="/referentiels">Référentiels →</Link>{" "}
        {aNiveauMinimum(utilisateur.niveau, "NIVEAU_3") && (
          <>
            · <Link href="/audit">Audit trail →</Link> · <Link href="/systeme-qualite">Système qualité →</Link>
          </>
        )}
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
        {affaires.map((a) => {
          const avancement = avancementParAffaire.get(a.id);
          return (
            <li
              key={a.id}
              style={{
                marginBottom: "1rem",
                border: "1px solid var(--couleur-bordure)",
                borderRadius: "var(--rayon-carte)",
                boxShadow: "var(--ombre-legere)",
                padding: "1rem 1.25rem",
              }}
            >
              <div style={{ fontFamily: "var(--font-titres)", fontWeight: 700, fontSize: "1.05rem" }}>{a.numero}</div>
              <div style={{ color: "var(--couleur-texte-attenue)", marginTop: "0.1rem" }}>
                {a.client} / {a.projet} ({a.typeRealisation.toLowerCase()}) — {a.joints.length} joint(s), {a.fncs.length}{" "}
                FNC
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0.5rem 0 0 0" }}>
                <Link href={`/affaires/${a.id}/dossier`}>Rapport de fin de fabrication →</Link>{" "}
                · <Link href={`/affaires/${a.id}/photos`}>Book photo →</Link>{" "}
                · <Link href={`/affaires/${a.id}/reglementaire`}>Dossier réglementaire →</Link>{" "}
                · <Link href={`/affaires/${a.id}/planning`}>Planning →</Link>{" "}
                · <Link href={`/affaires/${a.id}/organigramme`}>Organigramme →</Link>{" "}
                · <Link href={`/affaires/${a.id}/pv-externes`}>PV externes →</Link>{" "}
                · <Link href={`/affaires/${a.id}/etat-des-lieux`}>État des lieux →</Link>{" "}
                · <Link href={`/affaires/${a.id}/notes-rex`}>Notes REX →</Link>
              </p>
              {avancement && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.6rem" }}>
                  <div style={{ width: 200, height: 8, background: "var(--couleur-fond-discret)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${avancement.pourcentageGlobal}%`, height: "100%", background: "var(--couleur-conforme)", borderRadius: 999 }} />
                  </div>
                  <span style={{ fontSize: "0.85rem" }}>
                    <Link href={`/avancement/${a.id}`}>{avancement.pourcentageGlobal}% d&apos;avancement</Link>
                  </span>
                  {avancement.joints.prevus !== null && (
                    <span style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)" }}>
                      {avancement.joints.soudes}/{avancement.joints.prevus} joints soudés
                    </span>
                  )}
                  {avancement.fnc.ouvertes > 0 && (
                    <span style={{ fontSize: "0.85rem", color: "var(--couleur-non-conforme)" }}>
                      {avancement.fnc.ouvertes} FNC ouverte(s)
                    </span>
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
