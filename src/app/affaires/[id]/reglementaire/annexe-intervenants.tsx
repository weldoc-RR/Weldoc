import type { IntervenantAffaire } from "@/lib/contenuDossierReglementaire";

const LIBELLE_STATUT: Record<string, string> = {
  VALIDE: "valide",
  BIENTOT_ECHEANCE: "bientôt à échéance",
  EXPIRE: "expirée",
  SUSPENDU: "suspendue",
};

const COULEUR_STATUT: Record<string, string> = {
  VALIDE: "var(--couleur-conforme)",
  BIENTOT_ECHEANCE: "var(--couleur-a-verifier)",
  EXPIRE: "var(--couleur-non-conforme)",
  SUSPENDU: "var(--couleur-non-conforme)",
};

function Statut({ statut }: { statut: string }) {
  return (
    <span style={{ color: COULEUR_STATUT[statut] ?? "var(--couleur-texte-attenue)", fontWeight: "bold" }}>
      {LIBELLE_STATUT[statut] ?? statut}
    </span>
  );
}

// Annexe "Qualifications et aptitudes des intervenants" du dossier
// réglementaire (voir le cahier des charges, "DOSSIER RÉGLEMENTAIRE") :
// archive l'état des qualifications (soudage/CND) et de l'acuité visuelle
// des personnes ayant travaillé sur l'affaire — voir
// src/lib/contenuDossierReglementaire.ts. La vérification elle-même a déjà
// eu lieu en amont, au moment de chaque action (voir
// src/lib/aptitudePersonnel.ts) : cette annexe n'est qu'un état des lieux
// archivé pour le dossier transmis, pas une nouvelle vérification.
export function AnnexeIntervenants({ intervenants }: { intervenants: IntervenantAffaire[] }) {
  if (intervenants.length === 0) {
    return <p>Aucun soudeur ni contrôleur CND enregistré pour l&apos;instant sur cette affaire.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {intervenants.map((i) => (
        <li
          key={`${i.personnelId}-${i.role}`}
          style={{ marginBottom: "0.75rem", borderBottom: "1px solid var(--couleur-bordure)", paddingBottom: "0.5rem" }}
        >
          <strong>
            {i.prenom} {i.nom}
          </strong>{" "}
          — {i.role === "SOUDEUR" ? "soudeur" : `contrôleur CND (${i.methodes.join(", ")})`}
          {i.qualifications.length === 0 ? (
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "var(--couleur-non-conforme)" }}>
              Aucune qualification {i.role === "SOUDEUR" ? "soudage" : "CND"} enregistrée pour cette personne.
            </p>
          ) : (
            <ul style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem" }}>
              {i.qualifications.map((q) => (
                <li key={q.id}>
                  {q.reference} ({q.norme}
                  {q.procede ? ` — ${q.procede}` : ""}) — obtenue le {q.dateObtention.toLocaleDateString("fr-FR")}
                  {q.dateExpiration && `, échéance ${q.dateExpiration.toLocaleDateString("fr-FR")}`} —{" "}
                  <Statut statut={q.statutAffiche} />
                </li>
              ))}
            </ul>
          )}
          {i.role === "CONTROLEUR_CND" &&
            (i.acuiteVisuelle ? (
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem" }}>
                Acuité visuelle : test du {i.acuiteVisuelle.dateTest.toLocaleDateString("fr-FR")}
                {i.acuiteVisuelle.dateExpiration && `, échéance ${i.acuiteVisuelle.dateExpiration.toLocaleDateString("fr-FR")}`}
                {" — "}
                {i.acuiteVisuelle.apte ? "apte" : "non apte"} —{" "}
                <Statut statut={i.acuiteVisuelle.statutAffiche} />
              </p>
            ) : (
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "var(--couleur-non-conforme)" }}>
                Aucun test d&apos;acuité visuelle enregistré pour cette personne.
              </p>
            ))}
        </li>
      ))}
    </ul>
  );
}
