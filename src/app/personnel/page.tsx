import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";
import { calculerProchaineConfirmation } from "@/lib/confirmationQualification";
import { compterAlertesStatuts } from "@/lib/resumeStatutsPersonnel";
import { AjouterPersonnel } from "./ajouter-personnel";
import { AjouterQualification } from "./ajouter-qualification";
import { AjouterHabilitation } from "./ajouter-habilitation";
import { AjouterFormation } from "./ajouter-formation";
import { AjouterAcuite } from "./ajouter-acuite";
import { AjouterDocumentJustificatif } from "./ajouter-document-justificatif";
import { AjouterIndisponibilite } from "./ajouter-indisponibilite";
import { LIBELLE_NIVEAU } from "@/lib/niveaux";
import { ConfirmerValidite } from "./confirmer-validite";
import { ValiderReconduction } from "./valider-reconduction";
import { DefinirPin } from "./definir-pin";
import { SuspendreHabilitation } from "./suspendre-habilitation";
import { AjouterFonction } from "./ajouter-fonction";
import { ChangerMotDePasse } from "./changer-mot-de-passe";
import { ChangerNiveau } from "./changer-niveau";
import { BasculerCompte } from "./basculer-compte";
import { AutoriserSignature } from "./autoriser-signature";
import { RevoquerAutorisation } from "./revoquer-autorisation";
import { aNiveauMinimum } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LIBELLE_STATUT: Record<string, string> = {
  VALIDE: "valide",
  BIENTOT_ECHEANCE: "bientôt à échéance",
  EXPIRE: "expiré",
  EN_RENOUVELLEMENT: "en renouvellement",
  SUSPENDU: "suspendu",
};

function couleurStatut(statut: string): string {
  if (statut === "EXPIRE" || statut === "SUSPENDU") return "var(--couleur-non-conforme)";
  if (statut === "BIENTOT_ECHEANCE" || statut === "EN_RENOUVELLEMENT") return "var(--couleur-a-verifier)";
  return "inherit";
}

// Regroupe une liste (déjà triée du plus récent au plus ancien) par une
// clé : le premier élément de chaque groupe est le plus récent
// ("actuel"), les suivants forment l'historique — utilisé pour les
// habilitations et les acuités visuelles, dont un renouvellement crée un
// nouvel enregistrement plutôt que d'écraser le précédent (voir le
// PRINCIPE CENTRAL du cahier des charges).
function grouperActuelEtHistorique<T>(items: T[], cle: (item: T) => string): { actuel: T; historique: T[] }[] {
  const groupes = new Map<string, T[]>();
  for (const item of items) {
    const k = cle(item);
    const groupe = groupes.get(k);
    if (groupe) groupe.push(item);
    else groupes.set(k, [item]);
  }
  return [...groupes.values()].map(([actuel, ...historique]) => ({ actuel, historique }));
}

export default async function PersonnelPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [personnel, referentiels] = await Promise.all([
    prisma.personnel.findMany({
      orderBy: { nom: "asc" },
      include: {
        fonctions: true,
        qualifications: {
          include: { evenements: { orderBy: { date: "desc" } }, referentiel: { select: { code: true } } },
        },
        habilitations: { orderBy: { dateObtention: "desc" } },
        formations: { orderBy: { dateRealisation: "desc" } },
        acuitesVisuelles: { orderBy: { dateTest: "desc" } },
        documentsJustificatifs: {
          include: { ajoutePar: { select: { nom: true, prenom: true } } },
          orderBy: { createdAt: "desc" },
        },
        indisponibilites: { orderBy: { dateDebut: "desc" } },
        compte: { select: { id: true, statut: true } },
        autorisationsSignature: {
          where: { active: true },
          include: { accordeePar: { select: { nom: true, prenom: true } } },
          orderBy: { documentType: "asc" },
        },
      },
    }),
    prisma.referentiel.findMany({ select: { id: true, code: true, domaine: true }, orderBy: { code: "asc" } }),
  ]);

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Personnel</h1>
      <p style={{ marginTop: 0 }}>
        <Link href="/charte">Charte d&apos;utilisation et d&apos;intégrité →</Link>
      </p>

      <AjouterPersonnel />

      {personnel.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <AjouterQualification
            personnel={personnel.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom }))}
            referentiels={referentiels}
          />
          <AjouterHabilitation personnel={personnel.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom }))} />
          <AjouterFormation personnel={personnel.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom }))} />
          <AjouterAcuite personnel={personnel.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom }))} />
          <AjouterDocumentJustificatif personnel={personnel.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom }))} />
          <AjouterIndisponibilite personnel={personnel.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom }))} />
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {personnel.map((p) => {
          const habilitationsGroupees = grouperActuelEtHistorique(p.habilitations, (h) => h.intitule);
          const acuitesGroupees = grouperActuelEtHistorique(p.acuitesVisuelles, () => "acuite");
          const documentsGroupes = grouperActuelEtHistorique(p.documentsJustificatifs, (d) => d.intitule);

          // Résumé en tête de fiche (voir src/lib/resumeStatutsPersonnel.ts) :
          // même calcul de statut que chaque liste détaillée ci-dessous,
          // simplement agrégé pour repérer un problème sans avoir à tout
          // lire. Seul l'enregistrement le plus récent de chaque
          // habilitation/acuité/document compte (grouperActuelEtHistorique
          // ci-dessus) — l'historique, lui, ne doit pas générer d'alerte.
          const resume = compterAlertesStatuts([
            ...p.qualifications.map((q) =>
              q.evenements[0]?.type === "RECONDUCTION_PROPOSEE"
                ? "EN_RENOUVELLEMENT"
                : calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" })
            ),
            ...habilitationsGroupees.map(({ actuel: h }) => calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" })),
            ...acuitesGroupees.map(({ actuel: t }) => calculerStatut(t.dateExpiration, { suspendu: t.statut === "SUSPENDU" })),
            ...documentsGroupes.map(({ actuel: d }) => calculerStatut(d.dateExpiration, { suspendu: d.statut === "SUSPENDU" })),
          ]);
          const acuiteInapte = acuitesGroupees.some(({ actuel: t }) => !t.apte);

          return (
            <li key={p.id} style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--couleur-bordure)", paddingBottom: "1rem" }}>
              <strong>
                {p.prenom} {p.nom}
              </strong>{" "}
              — {p.matricule} — {p.societe} — {LIBELLE_NIVEAU[p.niveau]}
              {aNiveauMinimum(utilisateur.niveau, "NIVEAU_3") && (
                <>
                  <ChangerNiveau personnelId={p.id} niveauActuel={p.niveau} />
                  {p.compte && (
                    <>
                      {" — "}
                      <span style={{ fontSize: "0.8rem", color: p.compte.statut === "SUSPENDU" ? "var(--couleur-non-conforme)" : "var(--couleur-texte-discret)" }}>
                        Compte {p.compte.statut === "SUSPENDU" ? "suspendu" : "actif"}
                      </span>
                      <BasculerCompte compteId={p.compte.id} statut={p.compte.statut} />
                    </>
                  )}
                </>
              )}
              {(p.id === utilisateur.personnelId || aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) && (
                <>
                  {" — "}
                  <span style={{ fontSize: "0.8rem", color: "var(--couleur-texte-discret)" }}>
                    {p.pinHash ? "PIN défini" : "PIN non défini"}
                  </span>
                  <DefinirPin personnelId={p.id} />
                </>
              )}
              {p.compte && (p.id === utilisateur.personnelId || aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) && (
                <ChangerMotDePasse compteId={p.compte.id} estSoiMeme={p.id === utilisateur.personnelId} />
              )}
              <div>
                {p.fonctions.length > 0 && <>Fonctions : {p.fonctions.map((f) => f.fonction).join(", ")}</>}
                {aNiveauMinimum(utilisateur.niveau, "NIVEAU_2") && (
                  <AjouterFonction personnelId={p.id} fonctionsActuelles={p.fonctions.map((f) => f.fonction)} />
                )}
              </div>

              <div style={{ marginTop: "0.3rem" }}>
                {resume.urgentes === 0 && resume.bientotEcheance === 0 && !acuiteInapte ? (
                  <span
                    style={{ fontSize: "0.8rem", color: "#fff", background: "var(--couleur-conforme)", borderRadius: 5, padding: "0.1rem 0.5rem" }}
                  >
                    ✓ À jour
                  </span>
                ) : (
                  <>
                    {resume.urgentes > 0 && (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#fff",
                          background: "var(--couleur-non-conforme)",
                          borderRadius: 5,
                          padding: "0.1rem 0.5rem",
                          marginRight: "0.4rem",
                        }}
                      >
                        ⚠ {resume.urgentes} expiré(e)/suspendu(e)
                      </span>
                    )}
                    {resume.bientotEcheance > 0 && (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#10161d",
                          background: "var(--couleur-a-verifier)",
                          borderRadius: 5,
                          padding: "0.1rem 0.5rem",
                          marginRight: "0.4rem",
                        }}
                      >
                        {resume.bientotEcheance} bientôt à échéance
                      </span>
                    )}
                    {acuiteInapte && (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#fff",
                          background: "var(--couleur-non-conforme)",
                          borderRadius: 5,
                          padding: "0.1rem 0.5rem",
                        }}
                      >
                        ⚠ Acuité visuelle inapte
                      </span>
                    )}
                  </>
                )}
              </div>

              {p.qualifications.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", marginTop: "0.4rem" }}>Qualifications soudage/CND</div>
                  <ul>
                    {p.qualifications.map((q) => {
                      const statutCalcule =
                        q.evenements[0]?.type === "RECONDUCTION_PROPOSEE"
                          ? "EN_RENOUVELLEMENT"
                          : calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" });
                      const datesConfirmations = q.evenements
                        .filter((e) => e.type === "CONFIRMATION_VALIDITE")
                        .map((e) => e.date);
                      const confirmation = calculerProchaineConfirmation(
                        q.frequenceConfirmationMois,
                        q.dateObtention,
                        datesConfirmations
                      );
                      return (
                        <li key={q.id}>
                          {q.type} {q.reference} ({q.norme}
                          {q.referentiel && ` — ${q.referentiel.code}`}) —{" "}
                          <span style={{ color: couleurStatut(statutCalcule) }}>{LIBELLE_STATUT[statutCalcule]}</span>
                          {q.dateExpiration && ` (échéance ${q.dateExpiration.toLocaleDateString("fr-FR")})`}
                          {q.codeQualification && ` — ${q.codeQualification}`}
                          {q.groupeMateriaux && ` — groupe matériau ${q.groupeMateriaux}`}
                          {(q.epaisseurMinMm || q.epaisseurMaxMm) && (
                            <> — épaisseur {q.epaisseurMinMm ?? "?"} à {q.epaisseurMaxMm ?? "?"} mm</>
                          )}
                          {(q.diametreMinMm || q.diametreMaxMm) && (
                            <> — diamètre {q.diametreMinMm ?? "?"} à {q.diametreMaxMm ?? "?"} mm</>
                          )}
                          {q.organismeExamen && ` — examinée par ${q.organismeExamen}`}
                          {q.certificatUrl && (
                            <>
                              {" — "}
                              <a href={q.certificatUrl} target="_blank" rel="noopener noreferrer">
                                voir le certificat
                              </a>
                            </>
                          )}
                          {confirmation.prochaineDateDue && q.statut !== "SUSPENDU" && (
                            <>
                              {" — "}
                              <span style={{ color: confirmation.enRetard ? "var(--couleur-non-conforme)" : confirmation.bientotDue ? "var(--couleur-a-verifier)" : "inherit" }}>
                                confirmation {confirmation.enRetard ? "en retard depuis" : "due avant"} le{" "}
                                {confirmation.prochaineDateDue.toLocaleDateString("fr-FR")}
                              </span>
                              <ConfirmerValidite qualificationId={q.id} personnelId={p.id} />
                            </>
                          )}
                          {statutCalcule === "EN_RENOUVELLEMENT" && (
                            <div style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", marginTop: "0.2rem" }}>
                              {q.evenements[0]?.commentaire}
                              <ValiderReconduction qualificationId={q.id} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {habilitationsGroupees.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", marginTop: "0.4rem" }}>Habilitations</div>
                  <ul>
                    {habilitationsGroupees.map(({ actuel: h, historique }) => {
                      const statutCalcule = calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" });
                      return (
                        <li key={h.id}>
                          {h.intitule}
                          {h.reference && ` (${h.reference})`} —{" "}
                          <span style={{ color: couleurStatut(statutCalcule) }}>{LIBELLE_STATUT[statutCalcule]}</span>
                          {h.dateExpiration && ` (échéance ${h.dateExpiration.toLocaleDateString("fr-FR")})`}
                          {h.certificatUrl && (
                            <>
                              {" — "}
                              <a href={h.certificatUrl} target="_blank" rel="noopener noreferrer">
                                voir le certificat
                              </a>
                            </>
                          )}
                          {aNiveauMinimum(utilisateur.niveau, "NIVEAU_3") && (
                            <SuspendreHabilitation habilitationId={h.id} suspendue={h.statut === "SUSPENDU"} />
                          )}
                          {historique.length > 0 && (
                            <details style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)" }}>
                              <summary>Historique ({historique.length})</summary>
                              <ul>
                                {historique.map((anc) => (
                                  <li key={anc.id}>
                                    obtenue le {anc.dateObtention.toLocaleDateString("fr-FR")}
                                    {anc.dateExpiration && `, expirée le ${anc.dateExpiration.toLocaleDateString("fr-FR")}`}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {p.formations.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", marginTop: "0.4rem" }}>
                    Formations (historique complet)
                  </div>
                  <ul>
                    {p.formations.map((f) => {
                      const statutCalcule = calculerStatut(f.dateExpiration, { suspendu: f.statut === "SUSPENDU" });
                      return (
                        <li key={f.id}>
                          {f.intitule}
                          {f.organisme && ` — ${f.organisme}`} — suivie le{" "}
                          {f.dateRealisation.toLocaleDateString("fr-FR")}
                          {f.dateExpiration && (
                            <>
                              {" — "}
                              <span style={{ color: couleurStatut(statutCalcule) }}>{LIBELLE_STATUT[statutCalcule]}</span>
                              {` (échéance ${f.dateExpiration.toLocaleDateString("fr-FR")})`}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {acuitesGroupees.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", marginTop: "0.4rem" }}>Acuité visuelle</div>
                  <ul>
                    {acuitesGroupees.map(({ actuel: t, historique }) => {
                      const statutCalcule = calculerStatut(t.dateExpiration, { suspendu: t.statut === "SUSPENDU" });
                      return (
                        <li key={t.id}>
                          Test du {t.dateTest.toLocaleDateString("fr-FR")} —{" "}
                          <span style={{ color: t.apte ? "inherit" : "var(--couleur-non-conforme)" }}>{t.apte ? "apte" : "inapte"}</span>
                          {" — "}
                          <span style={{ color: couleurStatut(statutCalcule) }}>{LIBELLE_STATUT[statutCalcule]}</span>
                          {t.dateExpiration && ` (échéance ${t.dateExpiration.toLocaleDateString("fr-FR")})`}
                          {t.organisme && ` — ${t.organisme}`}
                          {t.certificatUrl && (
                            <>
                              {" — "}
                              <a href={t.certificatUrl} target="_blank" rel="noopener noreferrer">
                                voir le certificat
                              </a>
                            </>
                          )}
                          {historique.length > 0 && (
                            <details style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)" }}>
                              <summary>Historique ({historique.length})</summary>
                              <ul>
                                {historique.map((anc) => (
                                  <li key={anc.id}>
                                    {anc.dateTest.toLocaleDateString("fr-FR")} — {anc.apte ? "apte" : "inapte"}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {documentsGroupes.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", marginTop: "0.4rem" }}>
                    Documents justificatifs
                  </div>
                  <ul>
                    {documentsGroupes.map(({ actuel: d, historique }) => {
                      const statutCalcule = calculerStatut(d.dateExpiration, { suspendu: d.statut === "SUSPENDU" });
                      return (
                        <li key={d.id}>
                          {d.intitule}
                          {d.reference && ` (${d.reference})`} —{" "}
                          <span style={{ color: couleurStatut(statutCalcule) }}>{LIBELLE_STATUT[statutCalcule]}</span>
                          {d.dateExpiration && ` (échéance ${d.dateExpiration.toLocaleDateString("fr-FR")})`} —{" "}
                          <a href={d.documentUrl} target="_blank" rel="noopener noreferrer">
                            voir le document
                          </a>{" "}
                          <span style={{ fontSize: "0.8rem", color: "var(--couleur-texte-discret)" }}>
                            (ajouté par {d.ajoutePar.prenom} {d.ajoutePar.nom} le{" "}
                            {d.createdAt.toLocaleDateString("fr-FR")})
                          </span>
                          {historique.length > 0 && (
                            <details style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)" }}>
                              <summary>Historique ({historique.length})</summary>
                              <ul>
                                {historique.map((anc) => (
                                  <li key={anc.id}>
                                    {anc.dateDocument
                                      ? anc.dateDocument.toLocaleDateString("fr-FR")
                                      : anc.createdAt.toLocaleDateString("fr-FR")}
                                    {anc.dateExpiration && `, expiré le ${anc.dateExpiration.toLocaleDateString("fr-FR")}`}
                                    {" — "}
                                    <a href={anc.documentUrl} target="_blank" rel="noopener noreferrer">
                                      voir
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {p.indisponibilites.length > 0 && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", marginTop: "0.4rem" }}>
                    Indisponibilités (historique complet)
                  </div>
                  <ul>
                    {p.indisponibilites.map((i) => {
                      const maintenant = Date.now();
                      const enCours = i.dateDebut.getTime() <= maintenant && maintenant <= i.dateFin.getTime();
                      return (
                        <li key={i.id}>
                          {i.motif} — du {i.dateDebut.toLocaleDateString("fr-FR")} au{" "}
                          {i.dateFin.toLocaleDateString("fr-FR")}
                          {enCours && <span style={{ color: "var(--couleur-a-verifier)" }}> — en cours</span>}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {(p.autorisationsSignature.length > 0 || aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) && (
                <>
                  <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)", marginTop: "0.4rem" }}>
                    Autorisations de signature
                    {aNiveauMinimum(utilisateur.niveau, "NIVEAU_3") && <AutoriserSignature personnelId={p.id} />}
                  </div>
                  {p.autorisationsSignature.length > 0 && (
                    <ul>
                      {p.autorisationsSignature.map((a) => (
                        <li key={a.id}>
                          {a.documentType} — accordée par {a.accordeePar.prenom} {a.accordeePar.nom} le{" "}
                          {a.createdAt.toLocaleDateString("fr-FR")}
                          {aNiveauMinimum(utilisateur.niveau, "NIVEAU_3") && <RevoquerAutorisation id={a.id} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
