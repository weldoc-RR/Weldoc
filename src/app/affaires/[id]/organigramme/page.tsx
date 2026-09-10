import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { construireOrganigramme, type PersonneOrganigramme } from "@/lib/organigramme";

export const dynamic = "force-dynamic";

const LIBELLE_NIVEAU_COURT: Record<string, string> = {
  NIVEAU_1: "N1",
  NIVEAU_2: "N2",
  NIVEAU_3: "N3",
};

function pireStatutHabilitation(personne: PersonneOrganigramme): "EXPIRE" | "BIENTOT_ECHEANCE" | null {
  if (personne.habilitations.some((h) => h.statut === "EXPIRE" || h.statut === "SUSPENDU")) return "EXPIRE";
  if (personne.habilitations.some((h) => h.statut === "BIENTOT_ECHEANCE")) return "BIENTOT_ECHEANCE";
  return null;
}

function CartePersonne({ nom, prenom, sousLigne, present, alerteHabilitation }: {
  nom: string;
  prenom: string;
  sousLigne?: string;
  present?: boolean;
  alerteHabilitation?: "EXPIRE" | "BIENTOT_ECHEANCE" | null;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--couleur-bordure)",
        borderRadius: 6,
        padding: "0.6rem 0.75rem",
        minWidth: 180,
        background: "var(--couleur-fond-page)",
      }}
    >
      <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
        {prenom} {nom}
      </div>
      {sousLigne && <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)" }}>{sousLigne}</div>}
      <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
        {present && (
          <span style={{ fontSize: "0.75rem", color: "#fff", background: "var(--couleur-conforme)", borderRadius: 5, padding: "0.1rem 0.4rem" }}>
            ● présent
          </span>
        )}
        {alerteHabilitation === "EXPIRE" && (
          <span style={{ fontSize: "0.75rem", color: "#fff", background: "var(--couleur-non-conforme)", borderRadius: 5, padding: "0.1rem 0.4rem" }}>
            ⚠ habilitation expirée
          </span>
        )}
        {alerteHabilitation === "BIENTOT_ECHEANCE" && (
          <span style={{ fontSize: "0.75rem", color: "#10161d", background: "var(--couleur-a-verifier)", borderRadius: 5, padding: "0.1rem 0.4rem" }}>
            habilitation bientôt à échéance
          </span>
        )}
      </div>
    </div>
  );
}

// Organigramme chantier (voir le cahier des charges : "Généré
// automatiquement à partir des rôles, affectations, responsabilités,
// niveaux, délégations ; mis à jour à chaque modification pertinente du
// chantier") : rien n'est stocké ici, uniquement les rôles de l'affaire et
// les affectations actives du planning (src/lib/organigramme.ts, déjà
// utilisé par GET /api/affaires/[id]/organigramme et par l'annexe du
// rapport de fin de fabrication) — donc toujours à jour par construction.
// Vue arborescente plutôt qu'un simple texte : les trois rôles de
// l'affaire en tête, puis l'équipe chantier groupée par fonction.
export default async function OrganigrammePage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const organigramme = await construireOrganigramme(params.id);
  if (!organigramme) {
    notFound();
  }

  const roles = [
    { libelle: "Responsable", personne: organigramme.responsable },
    { libelle: "Chargé d'affaires", personne: organigramme.chargeAffaires },
    { libelle: "Coordinateur soudage", personne: organigramme.coordinateurSoudage },
  ];

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link> ·{" "}
        <Link href={`/affaires/${organigramme.affaire.id}/dossier`}>Rapport de fin de fabrication →</Link> ·{" "}
        <Link href={`/affaires/${organigramme.affaire.id}/planning`}>Voir/modifier le planning →</Link>
      </p>
      <h1>Organigramme — {organigramme.affaire.numero}</h1>
      <p>
        {organigramme.affaire.client} / {organigramme.affaire.projet}
      </p>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)" }}>
        Généré automatiquement à partir des rôles de l&apos;affaire et des affectations actuellement actives — rien
        n&apos;est saisi ici, tout se modifie depuis le planning.
      </p>

      {/* Racine : l'affaire */}
      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "inline-block", border: "2px solid var(--couleur-texte)", borderRadius: 6, padding: "0.6rem 1rem", fontWeight: "bold" }}>
          {organigramme.affaire.numero} — {organigramme.affaire.client}
        </div>
      </div>

      {/* Rôles de l'affaire, reliés au tronc par une ligne verticale */}
      <div style={{ borderLeft: "2px solid var(--couleur-bordure)", marginLeft: "1.25rem", paddingLeft: "1.25rem", marginTop: "0.25rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", paddingTop: "0.75rem" }}>
          {roles.map((r) => (
            <div key={r.libelle}>
              {r.personne ? (
                <CartePersonne nom={r.personne.nom} prenom={r.personne.prenom} sousLigne={r.libelle} />
              ) : (
                <div style={{ border: "1px dashed var(--couleur-bordure)", borderRadius: 6, padding: "0.6rem 0.75rem", minWidth: 180, color: "var(--couleur-texte-discret)", fontSize: "0.85rem" }}>
                  {r.libelle}
                  <br />— non désigné —
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Équipe chantier, deuxième branche du même tronc */}
        <div style={{ marginTop: "1rem", paddingTop: "0.75rem" }}>
          <div style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Équipe chantier (planning actif)</div>
          {organigramme.equipeParFonction.length === 0 ? (
            <p style={{ fontSize: "0.9rem", color: "var(--couleur-texte-discret)" }}>
              Aucune affectation active pour l&apos;instant.
            </p>
          ) : (
            organigramme.equipeParFonction.map((groupe) => (
              <div key={groupe.fonction} style={{ borderLeft: "2px solid var(--couleur-fond-discret)", marginLeft: "0.25rem", paddingLeft: "1rem", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.9rem", color: "var(--couleur-texte-attenue)", marginBottom: "0.4rem" }}>{groupe.fonction}</div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  {groupe.personnes.map((p, i) => (
                    <CartePersonne
                      key={`${p.personnel.id}-${i}`}
                      nom={p.personnel.nom}
                      prenom={p.personnel.prenom}
                      sousLigne={
                        `${LIBELLE_NIVEAU_COURT[p.personnel.niveau] ?? p.personnel.niveau}` +
                        (p.jointNumero ? ` — joint ${p.jointNumero}` : "") +
                        (p.codes ? ` — codes : ${p.codes}` : "")
                      }
                      present={p.present}
                      alerteHabilitation={pireStatutHabilitation(p)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
