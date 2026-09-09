import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { compilerDossierFinFabrication } from "@/lib/dossierFinFabrication";
import { ValiderRapport } from "./valider-rapport";
import { BoutonImprimer } from "./bouton-imprimer";
import { FormulaireBilanIntervention } from "./formulaire-bilan-intervention";
import { AjouterDiffusion } from "./ajouter-diffusion";
import { AjouterRevision } from "./ajouter-revision";
import { AjouterPerimetre } from "./ajouter-perimetre";
import { AjouterEvenementChronologie } from "./ajouter-evenement-chronologie";
import { FormulaireBilanDosimetrique } from "./formulaire-bilan-dosimetrique";
import { AjouterPortique } from "./ajouter-portique";

export const dynamic = "force-dynamic";

const LIBELLE_TYPE_REALISATION: Record<string, string> = { CHANTIER: "chantier", ATELIER: "atelier" };
const LIBELLE_TRAITEMENT: Record<string, string> = { ACCEPTE: "accepté", REMPLACE: "remplacé", REPARE: "réparé" };

// Suit, section par section, la structure du modèle réel de "Rapport de
// Fin d'Intervention" (RFI) fourni par l'entreprise — voir
// src/lib/dossierFinFabrication.ts. Les intitulés sont ceux du modèle
// réel ; aucune valeur n'est préremplie avec des données d'un chantier
// réel (confidentialité).
export default async function DossierPage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const dossier = await compilerDossierFinFabrication(params.id);
  if (!dossier) {
    notFound();
  }

  const peutModifier = aNiveauMinimum(utilisateur.niveau, "NIVEAU_2");
  const bilan = dossier.rfi.bilanIntervention;
  const diffusionsInternes = dossier.rfi.diffusions.filter((d) => d.portee === "INTERNE");
  const diffusionsExternes = dossier.rfi.diffusions.filter((d) => d.portee === "EXTERNE");

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 900 }}>
      <style>{`@media print { .no-print { display: none; } }`}</style>
      <p className="no-print">
        <Link href="/">← Affaires</Link> · <Link href={`/avancement/${dossier.affaire.id}`}>Avancement détaillé →</Link> ·{" "}
        <Link href={`/affaires/${dossier.affaire.id}/photos`}>Book photo ({dossier.photosCount}) →</Link> ·{" "}
        <Link href={`/affaires/${dossier.affaire.id}/reglementaire`}>
          Dossier réglementaire ({dossier.pointsReglementairesCount}) →
        </Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <h1>Rapport de fin de fabrication (RFI)</h1>
        <BoutonImprimer />
      </div>

      {/* ————— Cartouche ————— */}
      <h2>
        {dossier.affaire.numero} — {dossier.affaire.client} / {dossier.affaire.projet}
      </h2>
      <p>
        {LIBELLE_TYPE_REALISATION[dossier.affaire.typeRealisation] ?? dossier.affaire.typeRealisation}
        {dossier.affaire.chantier && ` — ${dossier.affaire.chantier}`}
        {dossier.affaire.site && ` (${dossier.affaire.site})`}
        {dossier.affaire.dateDebut && ` — du ${dossier.affaire.dateDebut.toLocaleDateString("fr-FR")}`}
        {dossier.affaire.dateFin && ` au ${dossier.affaire.dateFin.toLocaleDateString("fr-FR")}`}
      </p>
      {dossier.affaire.referentiels.length > 0 && <p>Référentiels : {dossier.affaire.referentiels.join(", ")}</p>}
      {bilan?.entiteEmettrice && <p>Entité émettrice : {bilan.entiteEmettrice}</p>}
      {bilan?.referenceOffreService && <p>Offre de service : {bilan.referenceOffreService}</p>}
      {bilan?.accessibilite && <p>Accessibilité : {bilan.accessibilite.toLowerCase()}</p>}
      {peutModifier && <FormulaireBilanIntervention affaireId={dossier.affaire.id} valeurs={bilan} />}

      <h3>Historique des révisions</h3>
      {dossier.rfi.revisions.length === 0 ? (
        <p>Aucune révision enregistrée.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              {["Ind.", "Date", "Nature des évolutions", "Rédacteur(s)", "Vérificateur(s)", "Approbateur(s)"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.2rem 0.4rem" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dossier.rfi.revisions.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.indice}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.date.toLocaleDateString("fr-FR")}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.natureEvolutions}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.redacteurs ?? "—"}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.verificateurs ?? "—"}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{r.approbateurs ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {peutModifier && <AjouterRevision affaireId={dossier.affaire.id} />}

      <h3>Diffusion</h3>
      <p style={{ fontSize: "0.9rem" }}>
        <strong>Interne :</strong>{" "}
        {diffusionsInternes.length === 0 ? "—" : diffusionsInternes.map((d) => `${d.nom}${d.organisme ? ` (${d.organisme})` : ""}`).join(", ")}
      </p>
      <p style={{ fontSize: "0.9rem" }}>
        <strong>Externe :</strong>{" "}
        {diffusionsExternes.length === 0 ? "—" : diffusionsExternes.map((d) => `${d.nom}${d.organisme ? ` (${d.organisme})` : ""}`).join(", ")}
      </p>
      {peutModifier && <AjouterDiffusion affaireId={dossier.affaire.id} />}

      {/* ————— 1. Définition ————— */}
      {bilan?.definitionIntervention && (
        <>
          <h3>1. Définition</h3>
          <p>{bilan.definitionIntervention}</p>
        </>
      )}

      {/* ————— 3. Travaux réalisés ————— */}
      <h3>3. Travaux réalisés</h3>
      {dossier.rfi.perimetresTravaux.length === 0 ? (
        <p>Aucun périmètre de travaux enregistré.</p>
      ) : (
        <ul>
          {dossier.rfi.perimetresTravaux.map((p, i) => (
            <li key={i}>
              <strong>{p.intervenant}</strong> — {p.description}
            </li>
          ))}
        </ul>
      )}
      {peutModifier && <AjouterPerimetre affaireId={dossier.affaire.id} />}

      {/* ————— 4. Organigramme ————— */}
      <h3>4. Organigramme de l&apos;intervention</h3>
      <ul>
        <li>
          Responsable :{" "}
          {dossier.organigramme.responsable
            ? `${dossier.organigramme.responsable.prenom} ${dossier.organigramme.responsable.nom}`
            : "— non désigné —"}
        </li>
        <li>
          Chargé d&apos;affaires :{" "}
          {dossier.organigramme.chargeAffaires
            ? `${dossier.organigramme.chargeAffaires.prenom} ${dossier.organigramme.chargeAffaires.nom}`
            : "— non désigné —"}
        </li>
        <li>
          Coordinateur soudage :{" "}
          {dossier.organigramme.coordinateurSoudage
            ? `${dossier.organigramme.coordinateurSoudage.prenom} ${dossier.organigramme.coordinateurSoudage.nom}`
            : "— non désigné —"}
        </li>
      </ul>
      <p className="no-print" style={{ fontSize: "0.85rem" }}>
        <Link href={`/affaires/${dossier.affaire.id}/planning`}>Voir/modifier le planning →</Link>
      </p>
      {dossier.organigramme.equipeParFonction.length === 0 ? (
        <p>Aucune affectation active pour l&apos;instant (voir le planning).</p>
      ) : (
        dossier.organigramme.equipeParFonction.map((groupe) => (
          <div key={groupe.fonction}>
            <p style={{ margin: "0.4rem 0 0.1rem 0" }}>
              <strong>{groupe.fonction}</strong>
            </p>
            <ul>
              {groupe.personnes.map((p, i) => (
                <li key={i}>
                  {p.prenom} {p.nom}
                  {p.present && <span style={{ color: "#0ca30c" }}> (présent)</span>}
                  {p.codes && ` — codes : ${p.codes}`}
                  {p.habilitationsExpirees > 0 && (
                    <span style={{ color: "crimson" }}> — {p.habilitationsExpirees} habilitation(s) expirée(s)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {/* ————— 6. Bilan technique de la prestation ————— */}
      <h3>6. Bilan technique de la prestation</h3>

      <h4>6.1. Résumé de l&apos;intervention (chronologie)</h4>
      {dossier.rfi.chronologie.length === 0 ? (
        <p>Aucun événement enregistré.</p>
      ) : (
        <ul>
          {dossier.rfi.chronologie.map((c, i) => (
            <li key={i}>
              {c.date.toLocaleDateString("fr-FR")} — {c.description}
            </li>
          ))}
        </ul>
      )}
      {peutModifier && <AjouterEvenementChronologie affaireId={dossier.affaire.id} />}

      <h4>6.2. Liste des pièces remplacées</h4>
      {dossier.rfi.piecesRemplacees.length === 0 ? (
        <p>Aucune matière enregistrée sur cette affaire.</p>
      ) : (
        <ul>
          {dossier.rfi.piecesRemplacees.map((m, i) => (
            <li key={i}>
              {m.designation} — {m.nuance}
              {m.fournisseur && ` (${m.fournisseur})`}
            </li>
          ))}
        </ul>
      )}

      {bilan?.rexPosesDeposes && (
        <>
          <h4>6.3. Retour d&apos;expérience sur les poses/déposes</h4>
          <p>{bilan.rexPosesDeposes}</p>
        </>
      )}

      <h4>6.4. Liste des FNC</h4>
      {dossier.fncs.length === 0 ? (
        <p>Aucune FNC pour cette affaire.</p>
      ) : (
        <ul>
          {dossier.fncs.map((f) => (
            <li key={f.id}>
              <strong>{f.reference}</strong>
              {f.jointNumero && ` (${f.jointNumero})`} — {f.description} — impact {f.impact.toLowerCase()} —{" "}
              <span style={{ color: f.statut === "CLOTUREE" ? "inherit" : "crimson" }}>{f.statut.toLowerCase()}</span>
              {f.traitement && ` — traitement : ${LIBELLE_TRAITEMENT[f.traitement]}`}
            </li>
          ))}
        </ul>
      )}

      <h4>6.5. Conclusion technique</h4>
      <p>
        <strong>6.5.1. Écarts entre travaux prévus et réalisés :</strong> {bilan?.ecartsTravauxPrevusRealises || "—"}
      </p>
      <p>
        <strong>6.5.2. Conformité des travaux :</strong> {bilan?.conformiteTravaux || "—"}
      </p>

      {/* ————— 7. Bilan radioprotection ————— */}
      <h3>7. Bilan radioprotection</h3>
      <h4>7.1. Bilan dosimétrique</h4>
      {dossier.rfi.bilanDosimetrique ? (
        <p>
          EDPI : {dossier.rfi.bilanDosimetrique.edpiMsv ?? "—"} mSv — EDPO : {dossier.rfi.bilanDosimetrique.edpoMsv ?? "—"} mSv — Réalisé :{" "}
          {dossier.rfi.bilanDosimetrique.realiseMsv ?? "—"} mSv — Delta : {dossier.rfi.bilanDosimetrique.deltaMsv ?? "—"} mSv
          {dossier.rfi.bilanDosimetrique.alea && ` — Aléa : ${dossier.rfi.bilanDosimetrique.alea}`}
        </p>
      ) : (
        <p>Aucun bilan dosimétrique enregistré.</p>
      )}
      {peutModifier && <FormulaireBilanDosimetrique affaireId={dossier.affaire.id} valeurs={dossier.rfi.bilanDosimetrique} />}

      <p style={{ marginTop: "0.5rem" }}>
        <strong>Portiques :</strong>
      </p>
      {dossier.rfi.portiquesRadioprotection.length === 0 ? (
        <p>Aucun relevé de portique enregistré.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              {["Catégorie", "Nombre", "Localisation", "Observations"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.2rem 0.4rem" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dossier.rfi.portiquesRadioprotection.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: "0.2rem 0.4rem" }}>{p.categorie}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{p.nombre}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{p.localisation ?? "—"}</td>
                <td style={{ padding: "0.2rem 0.4rem" }}>{p.observations ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {peutModifier && <AjouterPortique affaireId={dossier.affaire.id} />}

      {bilan?.bilanActionsRadioprotection && (
        <>
          <h4>7.2. Bilan des actions radioprotection</h4>
          <p>{bilan.bilanActionsRadioprotection}</p>
        </>
      )}
      {bilan?.analyseEcartsRadioprotectionAmelioration && (
        <>
          <h4>7.3. Analyse des écarts et proposition d&apos;amélioration</h4>
          <p>{bilan.analyseEcartsRadioprotectionAmelioration}</p>
        </>
      )}

      {/* ————— 8. Bilan global et retour d'expérience ————— */}
      <h3>8. Bilan global et retour d&apos;expérience</h3>
      <p>
        <strong>8.1. Bonnes pratiques :</strong> {bilan?.bonnesPratiques || "—"}
      </p>
      <p>
        <strong>8.2. Dysfonctionnements rencontrés :</strong> {bilan?.dysfonctionnements || "—"}
      </p>
      <p>
        <strong>8.3. Mesures correctives pour l&apos;intervention suivante :</strong> {bilan?.mesuresCorrectivesSuivantes || "—"}
      </p>

      <p style={{ fontSize: "0.8rem", color: "#898781" }}>
        Les annexes (organigrammes détaillés, dossier de réalisation de travaux, documents divers) ne sont pas
        encore gérées dans Weldoc — voir le book photo et le dossier réglementaire ci-dessus en attendant.
      </p>

      {/* ————— Détails techniques Weldoc (au-delà du modèle RFI) ————— */}
      <h3>Avancement</h3>
      <p>
        {dossier.avancement.pourcentageGlobal}% global — {dossier.avancement.joints.total} joint(s)
        {dossier.avancement.joints.reparations > 0 && ` (+${dossier.avancement.joints.reparations} réparation(s))`} —{" "}
        {dossier.avancement.fnc.cloturees}/{dossier.avancement.fnc.total} FNC clôturée(s)
      </p>

      <h3>Personnel intervenant</h3>
      {dossier.personnelIntervenant.length === 0 ? (
        <p>Aucun intervenant enregistré pour l&apos;instant.</p>
      ) : (
        <ul>
          {dossier.personnelIntervenant.map((p) => (
            <li key={p.id}>
              {p.prenom} {p.nom} — {p.roles.join(", ")}
              {p.qualificationsExpirees > 0 && (
                <span style={{ color: "darkorange" }}> — {p.qualificationsExpirees} qualification(s) expirée(s)</span>
              )}
              {p.qualificationsSuspendues > 0 && (
                <span style={{ color: "crimson" }}> — {p.qualificationsSuspendues} qualification(s) suspendue(s)</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {(dossier.wpsUtilises.length > 0 || dossier.qmosUtilises.length > 0) && (
        <>
          <h3>WPS / QMOS utilisés</h3>
          <ul>
            {dossier.wpsUtilises.map((w) => (
              <li key={`wps-${w.reference}-${w.version}`}>WPS {w.reference} (rév. {w.version})</li>
            ))}
            {dossier.qmosUtilises.map((q) => (
              <li key={`qmos-${q.reference}-${q.version}`}>QMOS {q.reference} (rév. {q.version})</li>
            ))}
          </ul>
        </>
      )}

      {dossier.consommablesUtilises.length > 0 && (
        <>
          <h3>Consommables CND utilisés</h3>
          <ul>
            {dossier.consommablesUtilises.map((c) => (
              <li key={`${c.type}-${c.fabricant}-${c.reference}-${c.lot}`}>
                {c.type} — {c.fabricant} {c.reference} (lot {c.lot})
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Joints ({dossier.joints.length})</h3>
      {dossier.joints.length === 0 ? (
        <p>Aucun joint enregistré pour l&apos;instant.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["Joint", "Type", "Soudeur", "WPS", "Contrôles"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: "0.3rem 0.5rem" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dossier.joints.map((j) => (
              <tr key={j.id}>
                <td style={{ padding: "0.3rem 0.5rem", paddingLeft: `${0.5 + j.indiceReparation * 1.2}rem` }}>
                  {j.indiceReparation > 0 && "↳ "}
                  {j.numeroAffiche}
                </td>
                <td style={{ padding: "0.3rem 0.5rem" }}>{j.typeJoint ?? "—"}</td>
                <td style={{ padding: "0.3rem 0.5rem" }}>{j.soudeur ?? "—"}</td>
                <td style={{ padding: "0.3rem 0.5rem" }}>{j.wpsReference ?? "—"}</td>
                <td style={{ padding: "0.3rem 0.5rem" }}>
                  {j.resultats.length === 0
                    ? "—"
                    : j.resultats
                        .map((r) => `${r.methode}: ${r.resultat === "CONFORME" ? "conforme" : r.resultat === "NON_CONFORME" ? "non conforme" : r.resultat}`)
                        .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Éléments manquants signalés</h3>
      {dossier.elementsManquants.length === 0 ? (
        <p style={{ color: "#0ca30c" }}>Rien à signaler.</p>
      ) : (
        <ul>
          {dossier.elementsManquants.map((e, i) => (
            <li key={i} style={{ color: e.gravite === "BLOQUANT" ? "crimson" : "darkorange" }}>
              {e.texte}
            </li>
          ))}
        </ul>
      )}
      <p style={{ fontSize: "0.8rem", color: "#898781" }}>
        Signalement à titre indicatif : Weldoc ne se substitue pas à un organisme réglementaire ou une certification
        externe, et ne décide jamais seul de la conformité réglementaire.
      </p>

      <h3>Validation de fin de fabrication</h3>
      {dossier.validation ? (
        <p>
          Validé par {dossier.validation.personnel.prenom} {dossier.validation.personnel.nom} le{" "}
          {dossier.validation.dateSignature.toLocaleDateString("fr-FR")}.
        </p>
      ) : dossier.pointsReglementairesBloquants.length > 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#d03b3b" }}>
          Validation impossible : {dossier.pointsReglementairesBloquants.length} point(s) réglementaire(s)
          bloquant(s) restent à lever (
          <Link href={`/affaires/${dossier.affaire.id}/reglementaire`}>voir le dossier réglementaire</Link>).
        </p>
      ) : aNiveauMinimum(utilisateur.niveau, "NIVEAU_3") ? (
        <div className="no-print">
          <p style={{ fontSize: "0.85rem", color: "#52514e" }}>
            Réservé au niveau 3. Signer ci-dessous enregistre la validation (personne, date, signature) — Weldoc ne
            valide jamais seul.
          </p>
          <ValiderRapport affaireId={dossier.affaire.id} />
        </div>
      ) : (
        <p style={{ fontSize: "0.85rem", color: "#898781" }}>Pas encore validé (réservé au niveau 3).</p>
      )}
    </main>
  );
}
