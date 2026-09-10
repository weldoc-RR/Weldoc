import type { IntervenantCND } from "@/lib/contenuDossierReglementaire";

const LIBELLE_STATUT: Record<string, string> = {
  VALIDE: "valide",
  BIENTOT_ECHEANCE: "bientôt à échéance",
  EXPIRE: "expirée",
  SUSPENDU: "suspendue",
};

const COULEUR_STATUT: Record<string, string> = {
  VALIDE: "#0ca30c",
  BIENTOT_ECHEANCE: "#fab219",
  EXPIRE: "#d03b3b",
  SUSPENDU: "#d03b3b",
};

// Rapport COFREND des intervenants (voir le cahier des charges, "DOSSIER
// RÉGLEMENTAIRE") : les personnes ayant réalisé au moins un des cinq
// contrôles CND (VT/PT/MT/RT/UT — le périmètre réel de la certification
// COFREND) sur un joint de cette affaire, avec leurs qualifications CND
// déjà enregistrées (`Qualification.type === "CND"`, voir
// src/lib/contenuDossierReglementaire.ts). Purement indicatif : Weldoc ne
// juge jamais si une qualification COFREND couvre réellement telle
// intervention, seule une personne habilitée en décide.
export function IntervenantsCND({ intervenants }: { intervenants: IntervenantCND[] }) {
  if (intervenants.length === 0) {
    return <p>Aucun contrôle CND (VT/PT/MT/RT/UT) enregistré pour l&apos;instant sur cette affaire.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {intervenants.map((i) => (
        <li key={i.personnelId} style={{ marginBottom: "0.75rem", borderBottom: "1px solid #eeeee8", paddingBottom: "0.5rem" }}>
          <strong>
            {i.prenom} {i.nom}
          </strong>{" "}
          — méthodes réalisées sur cette affaire : {i.methodes.join(", ")}
          {i.qualifications.length === 0 ? (
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "#d03b3b" }}>
              Aucune qualification CND enregistrée pour cette personne.
            </p>
          ) : (
            <ul style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem" }}>
              {i.qualifications.map((q) => (
                <li key={q.id}>
                  {q.reference} ({q.norme}
                  {q.procede ? ` — ${q.procede}` : ""}) — obtenue le {q.dateObtention.toLocaleDateString("fr-FR")}
                  {q.dateExpiration && `, échéance ${q.dateExpiration.toLocaleDateString("fr-FR")}`} —{" "}
                  <span style={{ color: COULEUR_STATUT[q.statutAffiche], fontWeight: "bold" }}>
                    {LIBELLE_STATUT[q.statutAffiche] ?? q.statutAffiche}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
