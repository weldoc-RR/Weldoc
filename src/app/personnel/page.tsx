import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

export const dynamic = "force-dynamic";

const LIBELLE_STATUT: Record<string, string> = {
  VALIDE: "valide",
  BIENTOT_ECHEANCE: "bientôt à échéance",
  EXPIRE: "expiré",
  EN_RENOUVELLEMENT: "en renouvellement",
  SUSPENDU: "suspendu",
};

export default async function PersonnelPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const personnel = await prisma.personnel.findMany({
    orderBy: { nom: "asc" },
    include: {
      fonctions: true,
      qualifications: { include: { evenements: { orderBy: { date: "desc" }, take: 1 } } },
    },
  });

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Personnel</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {personnel.map((p) => (
          <li key={p.id} style={{ marginBottom: "1.5rem", borderBottom: "1px solid #ddd", paddingBottom: "1rem" }}>
            <strong>
              {p.prenom} {p.nom}
            </strong>{" "}
            — {p.matricule} — {p.societe} — {p.niveau}
            {p.fonctions.length > 0 && <div>Fonctions : {p.fonctions.map((f) => f.fonction).join(", ")}</div>}
            {p.qualifications.length > 0 && (
              <ul>
                {p.qualifications.map((q) => {
                  const statutCalcule =
                    q.evenements[0]?.type === "RECONDUCTION_PROPOSEE"
                      ? "EN_RENOUVELLEMENT"
                      : calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" });
                  return (
                    <li key={q.id}>
                      {q.type} {q.reference} ({q.norme}) — {LIBELLE_STATUT[statutCalcule]}
                      {q.dateExpiration && ` (échéance ${q.dateExpiration.toLocaleDateString("fr-FR")})`}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
