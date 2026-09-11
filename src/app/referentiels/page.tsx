import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { AjouterReferentiel } from "./ajouter-referentiel";

export const dynamic = "force-dynamic";

// Bibliothèque des référentiels (codes de norme, ex. "EN ISO 9606-1",
// "EN 13480") : jusqu'ici le modèle Referentiel existait et pouvait déjà
// être lié à une qualification ou un produit dimensionnel
// (referentielId), mais rien ne permettait d'en créer un sans accès
// direct à la base — les listes déroulantes concernées restaient donc
// toujours vides. Un référentiel s'enregistre une seule fois ici, puis
// se choisit (jamais ressaisi) partout où il s'applique.
export default async function ReferentielsPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const referentiels = await prisma.referentiel.findMany({ orderBy: { code: "asc" } });

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Référentiels</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", maxWidth: 640 }}>
        Codes de norme utilisés par l&apos;entreprise (ex. EN 13480, ASME B31.3, EN ISO 9606-1) — à lier ensuite à
        une affaire (dossier réglementaire), une qualification ou un produit de la bibliothèque dimensionnelle.
      </p>

      <AjouterReferentiel />

      {referentiels.length === 0 ? (
        <p style={{ marginTop: "1rem" }}>Aucun référentiel enregistré pour l&apos;instant.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr>
              {["Code", "Domaine", "Édition/version"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid var(--couleur-bordure)", padding: "0.3rem 0.6rem" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {referentiels.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "0.3rem 0.6rem" }}>{r.code}</td>
                <td style={{ padding: "0.3rem 0.6rem" }}>{r.domaine}</td>
                <td style={{ padding: "0.3rem 0.6rem" }}>{r.version ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
