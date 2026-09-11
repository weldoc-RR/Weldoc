import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerAvancementAffaire } from "@/lib/avancement";

export const dynamic = "force-dynamic";

export default async function AvancementPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affaires = await prisma.affaire.findMany({ orderBy: { createdAt: "desc" } });
  const avancements = await Promise.all(
    affaires.map(async (a) => ({ affaire: a, avancement: await calculerAvancementAffaire(a.id) }))
  );

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Avancement</h1>
      <p style={{ color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        Pourcentage d&apos;avancement de chaque affaire, calculé à partir des phases du séquencement (terminées sur
        applicables). Cliquez sur une affaire pour le détail par séquence.
      </p>

      {avancements.length === 0 ? (
        <p>Aucune affaire pour l&apos;instant.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {avancements.map(({ affaire, avancement }) => (
            <Link key={affaire.id} href={`/avancement/${affaire.id}`} className="carte-lien">
              <div style={{ fontWeight: "bold", fontFamily: "var(--font-titres)" }}>{affaire.numero}</div>
              <div style={{ color: "var(--couleur-texte-attenue)", fontSize: "0.9rem", margin: "0.15rem 0 0.6rem 0" }}>
                {affaire.client} / {affaire.projet}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ flex: 1, height: 8, background: "var(--couleur-fond-discret)", borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${avancement.pourcentageGlobal}%`,
                      height: "100%",
                      background: "var(--couleur-primaire)",
                      borderRadius: 999,
                    }}
                  />
                </div>
                <strong style={{ fontFamily: "var(--font-titres)" }}>{avancement.pourcentageGlobal}%</strong>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem", fontSize: "0.8rem" }}>
                {avancement.joints.prevus !== null && (
                  <span style={{ color: "var(--couleur-texte-attenue)" }}>
                    {avancement.joints.soudes}/{avancement.joints.prevus} joints soudés
                  </span>
                )}
                {avancement.fnc.ouvertes > 0 && (
                  <span
                    style={{
                      color: "#fff",
                      background: "var(--couleur-non-conforme)",
                      borderRadius: 999,
                      padding: "0.1rem 0.55rem",
                    }}
                  >
                    {avancement.fnc.ouvertes} FNC ouverte(s)
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
