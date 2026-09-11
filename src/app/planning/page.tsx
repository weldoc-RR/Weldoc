import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { chevauche } from "@/lib/planning";

export const dynamic = "force-dynamic";

const LIBELLE_STATUT: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
};
const COULEUR_STATUT: Record<string, string> = {
  PLANIFIEE: "var(--couleur-texte-discret)",
  EN_COURS: "var(--couleur-conforme)",
};

// Vue globale du planning, toutes affaires confondues (voir le cahier des
// charges, "PLANNING" : "signale... conflit de planning") : la page
// /affaires/[id]/planning existante permet déjà d'affecter et de détecter un
// conflit affaire par affaire, mais rien ne permettait jusqu'ici de voir en
// un coup d'œil qui est prévu où et quand sur l'ensemble des affaires. Rien
// n'est stocké séparément ici : uniquement les affectations PLANIFIEE/EN_COURS
// déjà enregistrées via /affaires/[id]/planning, regroupées par personne.
export default async function PlanningGlobalPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affectations = await prisma.affectation.findMany({
    where: { statut: { in: ["PLANIFIEE", "EN_COURS"] } },
    include: {
      personnel: { select: { nom: true, prenom: true } },
      affaire: { select: { id: true, numero: true, client: true } },
      joint: { select: { numero: true, indiceReparation: true } },
    },
    orderBy: [{ dateDebut: "asc" }],
  });

  const parPersonnel = new Map<string, typeof affectations>();
  for (const a of affectations) {
    const liste = parPersonnel.get(a.personnelId) ?? [];
    liste.push(a);
    parPersonnel.set(a.personnelId, liste);
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Planning</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        Qui est prévu où et quand, toutes affaires confondues (affectations planifiées ou en cours — pas
        l&apos;historique terminé/annulé). Pour affecter quelqu&apos;un, ouvrir le planning de l&apos;affaire
        concernée. Un conflit signalé ici (double affectation sur une même période) n&apos;a jamais bloqué la
        création : c&apos;est une alerte, la décision reste humaine.
      </p>

      {parPersonnel.size === 0 ? (
        <p>Aucune affectation planifiée ou en cours pour l&apos;instant.</p>
      ) : (
        [...parPersonnel.entries()]
          .sort(([, a], [, b]) => `${a[0].personnel.nom}`.localeCompare(b[0].personnel.nom))
          .map(([personnelId, liste]) => {
            const trieeParDate = [...liste].sort((a, b) => a.dateDebut.getTime() - b.dateDebut.getTime());
            return (
              <div key={personnelId} style={{ marginTop: "1.25rem", border: "1px solid var(--couleur-bordure)", borderRadius: 6, padding: "1rem" }}>
                <h3 style={{ margin: "0 0 0.5rem 0" }}>
                  {trieeParDate[0].personnel.prenom} {trieeParDate[0].personnel.nom}
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {trieeParDate.map((a, index) => {
                    const enConflit = trieeParDate.some(
                      (autre, autreIndex) => autreIndex !== index && chevauche(a.dateDebut, a.dateFin, autre.dateDebut, autre.dateFin)
                    );
                    return (
                      <li
                        key={a.id}
                        style={{
                          padding: "0.4rem 0",
                          borderTop: index > 0 ? "1px solid var(--couleur-fond-discret)" : undefined,
                          fontSize: "0.95rem",
                        }}
                      >
                        <Link href={`/affaires/${a.affaire.id}/planning`}>
                          {a.affaire.numero} — {a.affaire.client}
                        </Link>{" "}
                        · {a.fonction}
                        {a.joint && ` (joint ${a.joint.numero}${a.joint.indiceReparation > 0 ? ` R${a.joint.indiceReparation}` : ""})`}
                        {" · "}
                        {a.dateDebut.toLocaleDateString("fr-FR")} → {a.dateFin.toLocaleDateString("fr-FR")}
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            color: "#fff",
                            background: COULEUR_STATUT[a.statut],
                            borderRadius: 5,
                            padding: "0.1rem 0.4rem",
                          }}
                        >
                          {LIBELLE_STATUT[a.statut]}
                        </span>
                        {enConflit && (
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.75rem",
                              color: "#fff",
                              background: "var(--couleur-non-conforme)",
                              borderRadius: 5,
                              padding: "0.1rem 0.4rem",
                            }}
                            title="Cette personne a une autre affectation active sur une période qui se recoupe"
                          >
                            ⚠ Conflit de planning
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
      )}
    </main>
  );
}
