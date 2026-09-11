import Link from "next/link";
import { BadgeControle } from "@/app/joints/badge-controle";
import type { LigneJointPV } from "@/lib/contenuDossierReglementaire";

function celluleMethode(controles: { numeroPV: string | null; resultat: string; date: Date }[]) {
  if (controles.length === 0) return <span style={{ color: "var(--couleur-texte-discret)" }}>—</span>;
  return (
    <>
      {controles.map((c, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {c.numeroPV || "(sans n° de PV)"}
        </div>
      ))}
    </>
  );
}

// Tableau des joints du dossier réglementaire (voir le cahier des charges,
// "DOSSIER RÉGLEMENTAIRE") : pour chaque joint de l'affaire, la fiche
// technique de suivi de soudage (FTS) et le "N° de PV" de chacun des cinq
// contrôles CND à indications (VT/PT/MT/RT/UT) déjà enregistrés — voir
// src/lib/contenuDossierReglementaire.ts. Purement une compilation de
// lecture : rien n'est ressaisi ni stocké ici.
export function JointsPV({ lignes }: { lignes: LigneJointPV[] }) {
  if (lignes.length === 0) {
    return <p>Aucun joint enregistré pour l&apos;instant sur cette affaire.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--couleur-fond-discret)", textAlign: "left" }}>
            <th style={{ padding: "0.3rem" }}>Joint</th>
            <th style={{ padding: "0.3rem" }}>WPS</th>
            <th style={{ padding: "0.3rem" }}>Soudeur</th>
            <th style={{ padding: "0.3rem" }}>FTS</th>
            <th style={{ padding: "0.3rem" }}>DIM</th>
            <th style={{ padding: "0.3rem" }}>PV VT</th>
            <th style={{ padding: "0.3rem" }}>PV PT</th>
            <th style={{ padding: "0.3rem" }}>PV MT</th>
            <th style={{ padding: "0.3rem" }}>PV RT</th>
            <th style={{ padding: "0.3rem" }}>PV UT</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.jointId} style={{ borderBottom: "1px solid var(--couleur-bordure)" }}>
              <td style={{ padding: "0.3rem" }}>
                <Link href="/joints">{l.numeroAffiche}</Link>
              </td>
              <td style={{ padding: "0.3rem" }}>{l.wpsReference ?? "—"}</td>
              <td style={{ padding: "0.3rem" }}>{l.soudeur ?? "—"}</td>
              <td style={{ padding: "0.3rem" }}>
                {l.ficheSoudage ? (l.ficheSoudage.signee ? "signée" : "en cours") : "—"}
              </td>
              <td style={{ padding: "0.3rem" }}>
                {l.dimensionnel.length === 0 ? (
                  <span style={{ color: "var(--couleur-texte-discret)" }}>—</span>
                ) : (
                  <BadgeControle sigle="DIM" dernierResultat={l.dimensionnel[l.dimensionnel.length - 1].resultat} />
                )}
              </td>
              <td style={{ padding: "0.3rem" }}>{celluleMethode(l.visuel)}</td>
              <td style={{ padding: "0.3rem" }}>{celluleMethode(l.ressuage)}</td>
              <td style={{ padding: "0.3rem" }}>{celluleMethode(l.magnetoscopie)}</td>
              <td style={{ padding: "0.3rem" }}>{celluleMethode(l.radiographie)}</td>
              <td style={{ padding: "0.3rem" }}>{celluleMethode(l.ultrasons)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
