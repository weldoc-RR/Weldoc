import { redirect } from "next/navigation";
import Link from "next/link";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { calculerIndicateursQualite } from "@/lib/systemeQualite";

export const dynamic = "force-dynamic";

function Carte({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--couleur-bordure)", padding: "0.75rem", marginBottom: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>{titre}</h3>
      {children}
    </div>
  );
}

function LigneStat({ label, valeur, couleur }: { label: string; valeur: number | string; couleur?: string }) {
  return (
    <p style={{ display: "flex", justifyContent: "space-between", margin: "0.2rem 0", fontSize: "0.9rem" }}>
      <span>{label}</span>
      <strong style={{ color: couleur }}>{valeur}</strong>
    </p>
  );
}

// Système qualité (voir le cahier des charges) : rassemble ce qui existe
// déjà (FNC, qualifications, signatures, contrôles, dossier
// réglementaire, bibliothèques versionnées, audit trail) en indicateurs
// exploitables pour un audit ISO 9001. Rien de nouveau n'est stocké ici,
// tout est recalculé à la lecture — voir src/lib/systemeQualite.ts.
// Weldoc fournit des preuves structurées, il ne "certifie" jamais
// l'entreprise lui-même. Réservé au niveau 3, comme l'audit trail : c'est
// un outil de contrôle interne, pas une donnée opérationnelle courante.
export default async function SystemeQualitePage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }
  if (!aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) {
    redirect("/");
  }

  const indicateurs = await calculerIndicateursQualite();

  return (
    <main style={{ padding: "2rem", maxWidth: 1000 }}>
      <p>
        <Link href="/audit">Audit trail →</Link>
      </p>
      <h1 style={{ marginBottom: "0.25rem" }}>Système qualité</h1>
      <p style={{ fontSize: "0.9rem", color: "var(--couleur-texte-attenue)", maxWidth: 700 }}>
        Preuves structurées pour un audit ISO 9001 (maîtrise documentaire, traçabilité, preuves de compétence,
        FNC/actions correctives, contrôles, validations), rassemblées à partir des modules déjà existants — rien
        n&apos;est recalculé après coup, et Weldoc ne certifie jamais l&apos;entreprise lui-même.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <Carte titre="Preuves de compétence — Qualifications">
          <LigneStat label="Valides" valeur={indicateurs.qualifications.valide} couleur="var(--couleur-conforme)" />
          <LigneStat label="Bientôt à échéance" valeur={indicateurs.qualifications.bientotEcheance} couleur="#c98a1f" />
          <LigneStat label="Expirées" valeur={indicateurs.qualifications.expire} couleur="var(--couleur-non-conforme)" />
          <LigneStat label="Suspendues" valeur={indicateurs.qualifications.suspendu} couleur="var(--couleur-non-conforme)" />
        </Carte>

        <Carte titre="Preuves de compétence — Habilitations">
          <LigneStat label="Valides" valeur={indicateurs.habilitations.valide} couleur="var(--couleur-conforme)" />
          <LigneStat label="Bientôt à échéance" valeur={indicateurs.habilitations.bientotEcheance} couleur="#c98a1f" />
          <LigneStat label="Expirées" valeur={indicateurs.habilitations.expire} couleur="var(--couleur-non-conforme)" />
          <LigneStat label="Suspendues" valeur={indicateurs.habilitations.suspendu} couleur="var(--couleur-non-conforme)" />
        </Carte>

        <Carte titre="Preuves de compétence — Formations">
          <LigneStat label="Valides" valeur={indicateurs.formations.valide} couleur="var(--couleur-conforme)" />
          <LigneStat label="Bientôt à échéance" valeur={indicateurs.formations.bientotEcheance} couleur="#c98a1f" />
          <LigneStat label="Expirées" valeur={indicateurs.formations.expire} couleur="var(--couleur-non-conforme)" />
        </Carte>

        <Carte titre="FNC / actions correctives">
          <LigneStat label="Total" valeur={indicateurs.fnc.total} />
          <LigneStat label="Ouvertes" valeur={indicateurs.fnc.ouvertes} couleur={indicateurs.fnc.ouvertes > 0 ? "#c98a1f" : undefined} />
          <LigneStat label="Clôturées" valeur={indicateurs.fnc.cloturees} couleur="var(--couleur-conforme)" />
          <LigneStat label="Bloquantes ouvertes" valeur={indicateurs.fnc.bloquantes} couleur={indicateurs.fnc.bloquantes > 0 ? "var(--couleur-non-conforme)" : undefined} />
        </Carte>

        <Carte titre="Dossier réglementaire">
          <LigneStat
            label="Points bloquants ouverts"
            valeur={indicateurs.pointsReglementairesBloquantsOuverts}
            couleur={indicateurs.pointsReglementairesBloquantsOuverts > 0 ? "var(--couleur-non-conforme)" : "var(--couleur-conforme)"}
          />
        </Carte>

        <Carte titre="Rapport de fin de fabrication">
          <LigneStat label="Affaires" valeur={indicateurs.rff.affairesTotal} />
          <LigneStat label="Validées (signées niveau 3)" valeur={indicateurs.rff.affairesValidees} couleur="var(--couleur-conforme)" />
        </Carte>

        <Carte titre="Traçabilité">
          <LigneStat label="Signatures enregistrées" valeur={indicateurs.signaturesTotal} />
        </Carte>
      </div>

      <h2 style={{ marginTop: "1.5rem" }}>Contrôles réalisés</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid var(--couleur-bordure)" }}>
            <th style={{ padding: "0.4rem" }}>Méthode</th>
            <th style={{ padding: "0.4rem" }}>Total</th>
            <th style={{ padding: "0.4rem" }}>Conformes</th>
            <th style={{ padding: "0.4rem" }}>Non conformes / hors tolérance</th>
          </tr>
        </thead>
        <tbody>
          {indicateurs.controles.map((c) => (
            <tr key={c.methode} style={{ borderBottom: "1px solid var(--couleur-bordure)" }}>
              <td style={{ padding: "0.4rem" }}>{c.methode}</td>
              <td style={{ padding: "0.4rem" }}>{c.total}</td>
              <td style={{ padding: "0.4rem", color: "var(--couleur-conforme)" }}>{c.conformes}</td>
              <td style={{ padding: "0.4rem", color: c.nonConformes > 0 ? "var(--couleur-non-conforme)" : undefined }}>{c.nonConformes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: "1.5rem" }}>Maîtrise documentaire (bibliothèques versionnées)</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid var(--couleur-bordure)" }}>
            <th style={{ padding: "0.4rem" }}>Bibliothèque</th>
            <th style={{ padding: "0.4rem" }}>En vigueur</th>
            <th style={{ padding: "0.4rem" }}>Ancienne version</th>
            <th style={{ padding: "0.4rem" }}>Retirée</th>
          </tr>
        </thead>
        <tbody>
          {indicateurs.documentsVersionnes.map((d) => (
            <tr key={d.categorie} style={{ borderBottom: "1px solid var(--couleur-bordure)" }}>
              <td style={{ padding: "0.4rem" }}>{d.categorie}</td>
              <td style={{ padding: "0.4rem", color: "var(--couleur-conforme)" }}>{d.enVigueur}</td>
              <td style={{ padding: "0.4rem", color: "var(--couleur-texte-discret)" }}>{d.ancienneVersion}</td>
              <td style={{ padding: "0.4rem", color: "var(--couleur-non-conforme)" }}>{d.retiree}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: "0.8rem", color: "var(--couleur-texte-discret)", marginTop: "1.5rem" }}>
        Pour le détail événement par événement (qui, quand, ancienne/nouvelle valeur), voir l&apos;
        <Link href="/audit">audit trail</Link>.
      </p>
    </main>
  );
}
