import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { compilerDossierFinFabrication } from "@/lib/dossierFinFabrication";
import { ValiderRapport } from "./valider-rapport";
import { BoutonImprimer } from "./bouton-imprimer";

export const dynamic = "force-dynamic";

const LIBELLE_TYPE_REALISATION: Record<string, string> = { CHANTIER: "chantier", ATELIER: "atelier" };

export default async function DossierPage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const dossier = await compilerDossierFinFabrication(params.id);
  if (!dossier) {
    notFound();
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 900 }}>
      <style>{`@media print { .no-print { display: none; } }`}</style>
      <p className="no-print">
        <Link href="/">← Affaires</Link> · <Link href={`/avancement/${dossier.affaire.id}`}>Avancement détaillé →</Link> ·{" "}
        <Link href={`/affaires/${dossier.affaire.id}/photos`}>Book photo ({dossier.photosCount}) →</Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <h1>Rapport de fin de fabrication</h1>
        <BoutonImprimer />
      </div>

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

      <h3>Organigramme</h3>
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

      <h3>FNC ({dossier.fncs.length})</h3>
      {dossier.fncs.length === 0 ? (
        <p>Aucune FNC pour cette affaire.</p>
      ) : (
        <ul>
          {dossier.fncs.map((f) => (
            <li key={f.id}>
              <strong>{f.reference}</strong>
              {f.jointNumero && ` (${f.jointNumero})`} — {f.description} — impact {f.impact.toLowerCase()} —{" "}
              <span style={{ color: f.statut === "CLOTUREE" ? "inherit" : "crimson" }}>{f.statut.toLowerCase()}</span>
            </li>
          ))}
        </ul>
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
