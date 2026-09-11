import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatutConsommable, type StatutAffichageConsommable } from "@/lib/statutConsommable";
import { ConsommableForm } from "./consommable-form";

export const dynamic = "force-dynamic";

const LIBELLE_STATUT: Record<StatutAffichageConsommable, string> = {
  VALIDE: "Valide",
  BIENTOT_ECHEANCE: "Bientôt périmé",
  PERIME: "Périmé",
};
const COULEUR_STATUT: Record<StatutAffichageConsommable, string> = {
  VALIDE: "var(--couleur-conforme)",
  BIENTOT_ECHEANCE: "var(--couleur-a-verifier)",
  PERIME: "var(--couleur-non-conforme)",
};

function BadgeStatut({ statut }: { statut: StatutAffichageConsommable }) {
  return (
    <span
      style={{
        fontSize: "0.8rem",
        color: statut === "BIENTOT_ECHEANCE" ? "var(--couleur-texte)" : "#fff",
        background: COULEUR_STATUT[statut],
        borderRadius: 5,
        padding: "0.2rem 0.5rem",
      }}
    >
      {LIBELLE_STATUT[statut]}
    </span>
  );
}

// Bibliothèque des consommables CND (pénétrant, révélateur, nettoyant pour
// le ressuage ; poudre magnétique, produit de contraste, démagnétisant
// pour la magnétoscopie ; film, produit de développement pour la
// radiographie ; couplant pour les ultrasons) : un produit/lot est
// enregistré une seule fois ici, puis choisi (jamais ressaisi) sur chaque
// PV depuis la page Joints.
export default async function ConsommablesPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const consommables = await prisma.consommableCND.findMany({ orderBy: [{ type: "asc" }, { fabricant: "asc" }] });

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Consommables CND</h1>
      <ConsommableForm />
      {consommables.length === 0 ? (
        <p>Aucun consommable enregistré pour l&apos;instant.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr>
              {["Type", "Fabricant", "Référence", "Lot", "Péremption", "Statut", "Certificat"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid var(--couleur-bordure)", padding: "0.3rem 0.6rem" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {consommables.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: "0.3rem 0.6rem" }}>{c.type}</td>
                <td style={{ padding: "0.3rem 0.6rem" }}>{c.fabricant}</td>
                <td style={{ padding: "0.3rem 0.6rem" }}>{c.reference}</td>
                <td style={{ padding: "0.3rem 0.6rem" }}>{c.lot}</td>
                <td style={{ padding: "0.3rem 0.6rem" }}>
                  {c.peremption ? c.peremption.toLocaleDateString("fr-FR") : "—"}
                </td>
                <td style={{ padding: "0.3rem 0.6rem" }}>
                  <BadgeStatut statut={calculerStatutConsommable(c.peremption)} />
                </td>
                <td style={{ padding: "0.3rem 0.6rem" }}>
                  {c.certificatUrl ? (
                    <a href={c.certificatUrl} target="_blank" rel="noreferrer">
                      certificat
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
