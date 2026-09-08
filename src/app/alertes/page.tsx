import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";

export const dynamic = "force-dynamic";

export default async function AlertesPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const outils = await prisma.outil.findMany({ where: { statut: { not: "HORS_SERVICE" } } });

  const alertes = outils
    .map((o) => ({ outil: o, statut: calculerStatutOutil(o.dateEcheance) }))
    .filter((a) => a.statut === "EXPIRE" || a.statut === "BIENTOT_ECHEANCE")
    .sort((a, b) => (a.outil.dateEcheance?.getTime() ?? 0) - (b.outil.dateEcheance?.getTime() ?? 0));

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Alertes</h1>
      <h2>Vérifications d'outillage</h2>
      {alertes.length === 0 ? (
        <p>Aucune alerte pour l'instant.</p>
      ) : (
        <ul>
          {alertes.map(({ outil, statut }) => (
            <li key={outil.id} style={{ color: statut === "EXPIRE" ? "crimson" : "darkorange" }}>
              <strong>{outil.reference}</strong> ({outil.type}) —{" "}
              {statut === "EXPIRE" ? "vérification expirée" : "à renouveler"} le{" "}
              {outil.dateEcheance?.toLocaleDateString("fr-FR")}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
