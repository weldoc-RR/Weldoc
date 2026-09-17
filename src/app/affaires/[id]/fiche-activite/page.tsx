import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { FormulaireEnTete } from "./formulaire-en-tete";
import { AjouterRevisionFicheActivite } from "./ajouter-revision-fiche-activite";

export const dynamic = "force-dynamic";

// Fiche de suivi d'activité avec contrôle technique par phase (voir le
// cahier des charges, section du même nom) : l'en-tête ci-dessous est
// porté par l'affaire (comme le rapport de fin d'intervention), le détail
// du contrôle technique et les signatures se trouvent phase par phase sur
// l'écran d'avancement — voir /avancement/[id].
export default async function FicheActivitePage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    notFound();
  }

  const revisions = await prisma.revisionFicheActivite.findMany({
    where: { affaireId: params.id },
    orderBy: { date: "desc" },
  });

  const peutModifier = aNiveauMinimum(utilisateur.niveau, "NIVEAU_2");

  return (
    <main style={{ padding: "2rem", maxWidth: 800 }}>
      <p>
        <Link href="/">← Affaires</Link> · <Link href={`/avancement/${affaire.id}`}>Avancement et phases →</Link>
      </p>
      <h1>Fiche de suivi d&apos;activité</h1>
      <h2 style={{ marginTop: 0 }}>
        {affaire.numero} — {affaire.client} / {affaire.projet}
      </h2>
      <p style={{ color: "var(--couleur-texte-attenue)" }}>
        En-tête de l&apos;activité (structure d&apos;un document type nucléaire/EDF). Le détail du contrôle
        technique et les signatures se saisissent phase par phase depuis{" "}
        <Link href={`/avancement/${affaire.id}`}>l&apos;écran d&apos;avancement</Link>.
      </p>

      {peutModifier ? (
        <FormulaireEnTete
          affaireId={affaire.id}
          valeurs={{
            libelleActivite: affaire.libelleActivite,
            tranche: affaire.tranche,
            metier: affaire.metier,
            equipementsConcernes: affaire.equipementsConcernes,
            otTaches: affaire.otTaches,
            domaineRequisInstallation: affaire.domaineRequisInstallation,
            conditionsParticulieresPrealables: affaire.conditionsParticulieresPrealables,
            numeroAdrModele: affaire.numeroAdrModele,
          }}
        />
      ) : (
        <div style={{ fontSize: "0.9rem" }}>
          <p>
            <strong>Activité :</strong> {affaire.libelleActivite || "—"}
          </p>
          <p>
            <strong>Tranche :</strong> {affaire.tranche || "—"} — <strong>Métier :</strong> {affaire.metier || "—"}
          </p>
          <p>
            <strong>Équipements concernés :</strong>{" "}
            {affaire.equipementsConcernes.length === 0 ? "—" : affaire.equipementsConcernes.join(", ")}
          </p>
          <p>
            <strong>OT / tâches :</strong> {affaire.otTaches.length === 0 ? "—" : affaire.otTaches.join(", ")}
          </p>
          <p>
            <strong>Domaine requis d&apos;installation :</strong> {affaire.domaineRequisInstallation || "—"}
          </p>
          <p>
            <strong>Conditions particulières et préalables :</strong> {affaire.conditionsParticulieresPrealables || "—"}
          </p>
          <p>
            <strong>Numéro ADR modèle :</strong> {affaire.numeroAdrModele || "—"}
          </p>
        </div>
      )}

      <h3 style={{ marginTop: "2rem" }}>Historique des indices du document</h3>
      {revisions.length === 0 ? (
        <p>Aucune révision enregistrée.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              {["Ind.", "Date", "Nature de l'évolution"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid var(--couleur-bordure)", padding: "0.2rem 0.4rem" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revisions.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.indice}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.date.toLocaleDateString("fr-FR")}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.natureEvolution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {peutModifier && <AjouterRevisionFicheActivite affaireId={affaire.id} />}
    </main>
  );
}
