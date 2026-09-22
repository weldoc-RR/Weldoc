import { Fragment } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { FormulaireEnTete } from "./formulaire-en-tete";
import { AjouterRevisionFicheActivite } from "./ajouter-revision-fiche-activite";
import { AjouterPhaseFiche } from "./ajouter-phase-fiche";
import { SupprimerPhaseFiche } from "./supprimer-phase-fiche";
import { ValiderFicheActivite } from "./valider-fiche-activite";
import { BoutonImprimer } from "../dossier/bouton-imprimer";
import { estPreparateur } from "@/lib/verificationRole";

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

// Code court (comme les colonnes "S / V" du document de référence) pour
// les fonctions autres qu'exécutant, qui a sa propre colonne.
const CODE_FONCTION: Record<string, string> = {
  CONTROLEUR_TECHNIQUE: "CT",
  SURVEILLANT: "S",
  VERIFICATEUR: "V",
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

  const [revisions, sequences, fonctionsUtilisateur, validation] = await Promise.all([
    prisma.revisionFicheActivite.findMany({ where: { affaireId: params.id }, orderBy: { date: "desc" } }),
    prisma.sequence.findMany({
      where: { affaireId: params.id },
      orderBy: { ordre: "asc" },
      include: {
        phases: {
          orderBy: { ordre: "asc" },
          include: {
            procedureInterne: { select: { reference: true, version: true } },
            signaturesDetaillees: {
              include: { personnel: { select: { nom: true, prenom: true } }, signature: { select: { dateSignature: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
    prisma.personnelFonction.findMany({ where: { personnelId: utilisateur.personnelId }, select: { fonction: true } }),
    prisma.signature.findFirst({
      where: { documentType: "FICHE_ACTIVITE", documentId: params.id },
      orderBy: { dateSignature: "desc" },
      include: { personnel: { select: { nom: true, prenom: true } } },
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
  const dernierIndice = revisions[0]?.indice ?? null;
  const estUtilisateurPreparateur = estPreparateur(fonctionsUtilisateur.map((f) => f.fonction));
  // Tant que la fiche n'est pas validée, le préparateur peut lister les
  // phases (les ajouter/les retirer) directement depuis ce document — voir
  // POST/DELETE /api/phases, qui refusent de toute façon toute
  // modification une fois la fiche validée.
  const peutEditerPhases = estUtilisateurPreparateur && !validation;

  return (
    <main style={{ padding: "2rem", maxWidth: 960 }}>
      <style>{`@media print { .no-print { display: none; } }`}</style>
      <p className="no-print">
        <Link href="/">← Affaires</Link> · <Link href={`/avancement/${affaire.id}`}>Avancement et phases →</Link>
      </p>
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end" }}>
        <BoutonImprimer />
      </div>

      {/* ————— Cartouche du document (mise en page inspirée d'un dossier de
          suivi d'intervention réel, sans logo ni élément de marque tiers :
          seule l'identité visuelle Weldoc apparaît) ————— */}
      <div style={{ display: "flex", border: "1px solid var(--couleur-bordure)", marginTop: "1rem", fontSize: "0.85rem" }}>
        <div
          style={{
            width: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid var(--couleur-bordure)",
            fontFamily: "var(--font-titres)",
            fontWeight: 800,
            fontSize: "1.4rem",
            color: "var(--couleur-primaire)",
            padding: "0.5rem",
            textAlign: "center",
          }}
        >
          WELDOC
        </div>
        <div style={{ flex: 1, padding: "0.5rem 0.9rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontFamily: "var(--font-titres)", fontWeight: 700, fontSize: "1.2rem" }}>Fiche de suivi d&apos;activité</div>
          <div style={{ color: "var(--couleur-texte-attenue)" }}>
            {affaire.numero} — {affaire.client} / {affaire.projet}
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--couleur-bordure)", padding: "0.5rem 0.9rem", minWidth: 190 }}>
          <div>
            <strong>Réf. Weldoc :</strong> {affaire.numero}
          </div>
          <div>
            <strong>Indice :</strong> {dernierIndice ?? "—"}
          </div>
        </div>
      </div>

      {validation && (
        <p style={{ marginTop: "0.75rem", color: "var(--couleur-conforme)", fontSize: "0.85rem" }}>
          ✓ Fiche validée par {validation.personnel.prenom} {validation.personnel.nom} le{" "}
          {validation.dateSignature.toLocaleDateString("fr-FR")} — le séquencement des phases est verrouillé.
        </p>
      )}

      {/* ————— En-tête d'activité (toujours affiché : c'est le contenu du document) ————— */}
      <div style={{ fontSize: "0.9rem", marginTop: "1rem" }}>
        <p>
          <strong>Activité :</strong> {affaire.libelleActivite || "—"}
        </p>
        <p>
          <strong>Tranche :</strong> {affaire.tranche || "—"}
        </p>
        <p>
          <strong>Équipements concernés :</strong>{" "}
          {affaire.equipementsConcernes.length === 0 ? "—" : affaire.equipementsConcernes.join(", ")}
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
              equipementsConcernes: affaire.equipementsConcernes,
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

      {/* ————— Tableau des phases : une table continue, en-têtes de section
          grisées et numérotation par séquence.phase — mise en page inspirée
          d'un dossier de suivi d'intervention réel (voir le cahier des
          charges, "FICHE DE SUIVI D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR
          PHASE"), sans aucun élément de marque tierce. ————— */}
      <h3 style={{ marginTop: "2rem" }}>Phases</h3>
      {sequences.every((s) => s.phases.length === 0) && !peutEditerPhases ? (
        <p>Aucune phase pour l&apos;instant.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.8rem" }}>
          <thead>
            <tr>
              {["N°", "Libellé de l'opération", "Mode opératoire / Indice", "Exécutant — Nom / Date", "Signatures S / V / CT", "Commentaires"].map(
                (h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", borderBottom: "2px solid var(--couleur-bordure)", padding: "0.3rem 0.4rem", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {sequences.map(
              (s, iSeq) =>
                (s.phases.length > 0 || peutEditerPhases) && (
                  <Fragment key={s.id}>
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          background: "var(--couleur-fond-discret)",
                          fontWeight: 700,
                          padding: "0.35rem 0.5rem",
                          borderTop: "1px solid var(--couleur-bordure)",
                          borderBottom: "1px solid var(--couleur-bordure)",
                        }}
                      >
                        {iSeq + 1}. {s.nom.toUpperCase()}
                      </td>
                    </tr>
                    {s.phases.map((p, iPhase) => {
                      const signatureSimple = p.signatureId ? signaturesSimples.find((sig) => sig.id === p.signatureId) : undefined;
                      const executant = p.signaturesDetaillees.find((sd) => sd.fonction === "EXECUTANT");
                      const autres = p.signaturesDetaillees.filter((sd) => sd.fonction !== "EXECUTANT");
                      const commentaires = [
                        p.attendusControleTechnique && `Attendus : ${p.attendusControleTechnique}`,
                        p.numeroAdrSpecifique && `ADR : ${p.numeroAdrSpecifique}`,
                      ].filter(Boolean);
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--couleur-bordure)" }}>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top", whiteSpace: "nowrap" }}>
                            {iSeq + 1}.{iPhase + 1}
                            {peutEditerPhases && <SupprimerPhaseFiche phaseId={p.id} nom={p.nom} />}
                          </td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>
                            {p.nom}
                            {p.libelleControleTechnique && (
                              <div style={{ fontSize: "0.75rem", color: "var(--couleur-texte-attenue)" }}>{p.libelleControleTechnique}</div>
                            )}
                            <div style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)" }}>{LIBELLE_STATUT[p.statut] ?? p.statut}</div>
                          </td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>
                            {p.procedureInterne ? `${p.procedureInterne.reference} — ${p.procedureInterne.version}` : "—"}
                          </td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>
                            {executant ? (
                              <>
                                {executant.personnel.prenom} {executant.personnel.nom}
                                <div style={{ fontSize: "0.75rem", color: "var(--couleur-texte-attenue)" }}>
                                  {executant.signature.dateSignature.toLocaleDateString("fr-FR")}
                                </div>
                              </>
                            ) : signatureSimple ? (
                              <>
                                {signatureSimple.personnel.prenom} {signatureSimple.personnel.nom}
                                <div style={{ fontSize: "0.75rem", color: "var(--couleur-texte-attenue)" }}>
                                  {signatureSimple.dateSignature.toLocaleDateString("fr-FR")}
                                </div>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>
                            {autres.length === 0 ? (
                              "—"
                            ) : (
                              <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                                {autres.map((sd) => (
                                  <li key={sd.id}>
                                    <strong>{CODE_FONCTION[sd.fonction] ?? (LIBELLE_FONCTION[sd.fonction] ?? sd.fonction)} :</strong>{" "}
                                    {sd.personnel.prenom} {sd.personnel.nom} (
                                    {sd.signature.dateSignature.toLocaleDateString("fr-FR")})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "top" }}>
                            {commentaires.length === 0 ? "—" : commentaires.map((c, i) => <div key={i}>{c}</div>)}
                          </td>
                        </tr>
                      );
                    })}
                    {peutEditerPhases && (
                      <AjouterPhaseFiche sequenceId={s.id} prochainOrdre={Math.max(0, ...s.phases.map((p) => p.ordre)) + 1} />
                    )}
                  </Fragment>
                )
            )}
          </tbody>
        </table>
      )}
      <p className="no-print" style={{ fontSize: "0.85rem" }}>
        {peutEditerPhases
          ? "Ajouter/supprimer une phase se fait ci-dessus. "
          : estUtilisateurPreparateur
            ? ""
            : "Seul un préparateur peut lister les phases (les ajouter ou les retirer). "}
        Saisir le contrôle technique ou signer se fait depuis{" "}
        <Link href={`/avancement/${affaire.id}`}>l&apos;écran d&apos;avancement</Link> — ce document se met à jour automatiquement.
      </p>

      {estUtilisateurPreparateur && !validation && <ValiderFicheActivite affaireId={affaire.id} />}
    </main>
  );
}
