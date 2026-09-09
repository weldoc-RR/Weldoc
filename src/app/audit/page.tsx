import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Audit trail (voir le cahier des charges, "AUDIT TRAIL") : historique des
// modifications sensibles, jamais supprimé. Réservé au niveau 3 (outil de
// contrôle interne, voir "DROITS ET MODIFICATIONS"). Filtrable par entité
// et identifiant d'entité via l'adresse (?entite=...&entiteId=...).
export default async function AuditTrailPage({ searchParams }: { searchParams: { entite?: string; entiteId?: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }
  if (!aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) {
    redirect("/");
  }

  const { entite, entiteId } = searchParams;
  const entrees = await prisma.auditTrail.findMany({
    where: { entite: entite ?? undefined, entiteId: entiteId ?? undefined },
    orderBy: { date: "desc" },
    take: 200,
  });
  const personnel = await prisma.personnel.findMany({
    where: { id: { in: [...new Set(entrees.map((e) => e.utilisateurId))] } },
    select: { id: true, nom: true, prenom: true },
  });
  const personnelParId = new Map(personnel.map((p) => [p.id, p]));

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 1000 }}>
      <p>
        <Link href="/">← Accueil</Link>
      </p>
      <h1>Audit trail</h1>
      <p style={{ fontSize: "0.85rem", color: "#898781" }}>
        Historique des modifications sensibles de l&apos;application (200 plus récentes) : qui, quand, ancienne et
        nouvelle valeur, motif si renseigné. Rien n&apos;est jamais supprimé ici.
        {(entite || entiteId) && (
          <>
            {" "}
            Filtré{entite && ` sur « ${entite} »`}
            {entiteId && ` (id ${entiteId})`} — <Link href="/audit">voir tout →</Link>
          </>
        )}
      </p>

      {entrees.length === 0 ? (
        <p>Aucune entrée pour l&apos;instant.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "0.4rem" }}>Date</th>
              <th style={{ padding: "0.4rem" }}>Utilisateur</th>
              <th style={{ padding: "0.4rem" }}>Entité</th>
              <th style={{ padding: "0.4rem" }}>Ancienne valeur</th>
              <th style={{ padding: "0.4rem" }}>Nouvelle valeur</th>
              <th style={{ padding: "0.4rem" }}>Motif</th>
            </tr>
          </thead>
          <tbody>
            {entrees.map((e) => {
              const u = personnelParId.get(e.utilisateurId);
              return (
                <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.4rem", whiteSpace: "nowrap" }}>
                    {e.date.toLocaleDateString("fr-FR")} {e.date.toLocaleTimeString("fr-FR")}
                  </td>
                  <td style={{ padding: "0.4rem" }}>{u ? `${u.prenom} ${u.nom}` : "—"}</td>
                  <td style={{ padding: "0.4rem" }}>
                    <Link href={`/audit?entite=${encodeURIComponent(e.entite)}&entiteId=${encodeURIComponent(e.entiteId)}`}>
                      {e.entite}
                    </Link>
                  </td>
                  <td style={{ padding: "0.4rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                    {e.ancienneValeur ? JSON.stringify(e.ancienneValeur) : "—"}
                  </td>
                  <td style={{ padding: "0.4rem", fontFamily: "monospace", fontSize: "0.75rem" }}>
                    {e.nouvelleValeur ? JSON.stringify(e.nouvelleValeur) : "—"}
                  </td>
                  <td style={{ padding: "0.4rem" }}>{e.motif || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
