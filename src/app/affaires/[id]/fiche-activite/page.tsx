import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { FormulaireEnTete } from "./formulaire-en-tete";
import { AjouterRevisionFicheActivite } from "./ajouter-revision-fiche-activite";
import { BoutonImprimer } from "../dossier/bouton-imprimer";

export const dynamic = "force-dynamic";

const LIBELLE_STATUT: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  NON_APPLICABLE: "Non applicable",
};

const LIBELLE_FONCTION: Record<string, string> = {
  EXECUTANT: "Exécutant",
  CONTROLEUR_TECHNIQUE: "Contrôleur technique",
  SURVEILLANT: "Surveillant",
  VERIFICATEUR: "Vérificateur",
};

// Fiche de suivi d'activité avec contrôle technique par phase (voir le
// cahier des charges, section du même nom) : reproduit, à partir des
// données déjà saisies (en-tête sur l'affaire, contrôle technique et
// signatures détaillées sur chaque phase — voir l'écran d'avancement),
// la mise en page du document réel envoyé par l'entreprise, imprimable/
// exportable en PDF — même principe que le rapport de fin de fabrication
// (voir /affaires/[id]/dossier).
export default async function FicheActivitePage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    notFound();
  }

  const [revisions, sequences] = await Promise.all([
    prisma.revisionFicheActivite.findMany({ where: { affaireId: params.id }, orderBy: { date: "desc" } }),
    prisma.sequence.findMany({
      where: { affaireId: params.id },
      orderBy: { ordre: "asc" },
      include: {
        phases: {
          orderBy: { ordre: "asc" },
          include: {
            signaturesDetaillees: {
              include: { personnel: { select: { nom: true, prenom: true } }, signature: { select: { dateSignature: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
  ]);

  // Signature simple de l'exécutant (voir POST /api/phases/signer) :
  // Phase.signatureId reste une référence libre, comme ailleurs dans le
  // modèle — on résout ici les Signature correspondantes.
  const signatureIds = sequences.flatMap((s) => s.phases.map((p) => p.signatureId).filter((id): id is string => id != null));
  const signaturesSimples =
    signatureIds.length > 0
      ? await prisma.signature.findMany({ where: { id: { in: signatureIds } }, include: { personnel: { select: { nom: true, prenom: true } } } })
      : [];

  const peutModifier = aNiveauMinimum(utilisateur.niveau, "NIVEAU_2");

  return (
    <main style={{ padding: "2rem", maxWidth: 900 }}>
      <style>{`@media print { .no-print { display: none; } }`}</style>
      <p className="no-print">
        <Link href="/">← Affaires</Link> · <Link href={`/avancement/${affaire.id}`}>Avancement et phases →</Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <h1>Fiche de suivi d&apos;activité</h1>
        <BoutonImprimer />
      </div>
      <h2 style={{ marginTop: 0 }}>
        {affaire.numero} — {affaire.client} / {affaire.projet}
      </h2>

      {/* ————— Cartouche (toujours affiché : c'est le contenu du document) ————— */}
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
          <strong>Domaine requis d&apos;installation / événements générés :</strong> {affaire.domaineRequisInstallation || "—"}
        </p>
        <p>
          <strong>Conditions particulières et préalables :</strong> {affaire.conditionsParticulieresPrealables || "—"}
        </p>
        <p>
          <strong>Numéro ADR modèle :</strong> {affaire.numeroAdrModele || "—"}
        </p>
      </div>

      {peutModifier && (
        <div className="no-print" style={{ marginTop: "1rem", padding: "0.75rem", border: "1px solid var(--couleur-bordure)", background: "var(--couleur-fond-discret)" }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>Modifier l&apos;en-tête</p>
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

      {/* ————— Tableau des phases : contrôle technique et signatures ————— */}
      <h3 style={{ marginTop: "2rem" }}>Phases, contrôle technique et signatures</h3>
      {sequences.every((s) => s.phases.length === 0) ? (
        <p>
          Aucune phase pour l&apos;instant — voir <Link href={`/avancement/${affaire.id}`}>l&apos;écran d&apos;avancement</Link> pour en
          ajouter et saisir le contrôle technique de chacune.
        </p>
      ) : (
        sequences.map(
          (s) =>
            s.phases.length > 0 && (
              <div key={s.id} style={{ marginBottom: "1.25rem" }}>
                <h4 style={{ marginBottom: "0.3rem" }}>{s.nom}</h4>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      {["Phase", "Statut", "Contrôle technique — libellé", "Attendus", "N° ADR", "Signatures"].map((h) => (
                        <th key={h} style={{ textAlign: "left", borderBottom: "1px solid var(--couleur-bordure)", padding: "0.25rem 0.4rem" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.phases.map((p) => {
                      const signatureSimple = p.signatureId ? signaturesSimples.find((sig) => sig.id === p.signatureId) : undefined;
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--couleur-bordure)" }}>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>{p.nom}</td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>{LIBELLE_STATUT[p.statut] ?? p.statut}</td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>{p.libelleControleTechnique || "—"}</td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>{p.attendusControleTechnique || "—"}</td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>{p.numeroAdrSpecifique || "—"}</td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>
                            {p.signaturesDetaillees.length === 0 && !signatureSimple ? (
                              "—"
                            ) : (
                              <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                                {signatureSimple && (
                                  <li>
                                    Exécutant — {signatureSimple.personnel.prenom} {signatureSimple.personnel.nom} (
                                    {signatureSimple.dateSignature.toLocaleDateString("fr-FR")})
                                  </li>
                                )}
                                {p.signaturesDetaillees.map((sd) => (
                                  <li key={sd.id}>
                                    {LIBELLE_FONCTION[sd.fonction] ?? sd.fonction} — {sd.personnel.prenom} {sd.personnel.nom}
                                    {sd.habilitation && ` — hab. ${sd.habilitation}`}
                                    {sd.nni && ` — NNI ${sd.nni}`}
                                    {sd.entrepriseService && ` — ${sd.entrepriseService}`} ({sd.signature.dateSignature.toLocaleDateString("fr-FR")})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
        )
      )}
      <p className="no-print" style={{ fontSize: "0.85rem" }}>
        Ajouter/supprimer une phase, saisir son contrôle technique ou signer se fait depuis{" "}
        <Link href={`/avancement/${affaire.id}`}>l&apos;écran d&apos;avancement</Link> — ce document se met à jour automatiquement.
      </p>
    </main>
  );
}
