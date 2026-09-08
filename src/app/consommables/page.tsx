import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { ConsommableForm } from "./consommable-form";

export const dynamic = "force-dynamic";

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
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Consommables CND</h1>
      <ConsommableForm />
      {consommables.length === 0 ? (
        <p>Aucun consommable enregistré pour l&apos;instant.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr>
              {["Type", "Fabricant", "Référence", "Lot", "Péremption"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.3rem 0.6rem" }}>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
