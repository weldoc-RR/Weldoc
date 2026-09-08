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
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Avancement</h1>
      <p>
        Pourcentage d&apos;avancement de chaque affaire, calculé à partir des phases du séquencement (terminées sur
        applicables). Cliquez sur une affaire pour le détail par séquence.
      </p>

      {avancements.length === 0 ? (
        <p>Aucune affaire pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {avancements.map(({ affaire, avancement }) => (
            <li
              key={affaire.id}
              style={{ marginBottom: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.75rem" }}
            >
              <Link href={`/avancement/${affaire.id}`} style={{ fontWeight: "bold" }}>
                {affaire.numero}
              </Link>{" "}
              — {affaire.client} / {affaire.projet}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.35rem" }}>
                <div style={{ width: 320, height: 10, background: "#e1e0d9", borderRadius: 5, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${avancement.pourcentageGlobal}%`,
                      height: "100%",
                      background: "#0ca30c",
                    }}
                  />
                </div>
                <strong>{avancement.pourcentageGlobal}%</strong>
                {avancement.fnc.ouvertes > 0 && (
                  <span style={{ color: "#d03b3b" }}>{avancement.fnc.ouvertes} FNC ouverte(s)</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
