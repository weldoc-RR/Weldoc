import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { AccepterCharte } from "./accepter-charte";
import { PublierCharte } from "./publier-charte";

export const dynamic = "force-dynamic";

export default async function ChartePage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const chartes = await prisma.chartVersion.findMany({
    orderBy: { publieLe: "desc" },
    include: { acceptations: { where: { personnelId: utilisateur.personnelId } } },
  });
  const charteEnVigueur = chartes[0] ?? null;
  const jeLaiAcceptee = (charteEnVigueur?.acceptations.length ?? 0) > 0;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Charte d&apos;utilisation et d&apos;intégrité</h1>
      <p>
        À accepter avant de pouvoir signer un document (contrôle, validation de qualification...) via
        identification QR/matricule + PIN. Une nouvelle version doit être réacceptée par tout le monde.
      </p>

      {aNiveauMinimum(utilisateur.niveau, "NIVEAU_3") && <PublierCharte />}

      {!charteEnVigueur ? (
        <p>Aucune version de la charte n&apos;a encore été publiée.</p>
      ) : (
        <div style={{ border: "1px solid var(--couleur-bordure)", padding: "1rem", maxWidth: 700 }}>
          <h2 style={{ marginTop: 0 }}>
            Version en vigueur : {charteEnVigueur.version}{" "}
            <span style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)" }}>
              (publiée le {charteEnVigueur.publieLe.toLocaleDateString("fr-FR")})
            </span>
          </h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{charteEnVigueur.contenu}</p>
          {jeLaiAcceptee ? (
            <p style={{ color: "var(--couleur-conforme)" }}>✓ Vous avez accepté cette version.</p>
          ) : (
            <AccepterCharte charteId={charteEnVigueur.id} />
          )}
        </div>
      )}

      {chartes.length > 1 && (
        <>
          <h2 style={{ marginTop: "2rem" }}>Versions précédentes</h2>
          <ul>
            {chartes.slice(1).map((c) => (
              <li key={c.id}>
                {c.version} — publiée le {c.publieLe.toLocaleDateString("fr-FR")}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
