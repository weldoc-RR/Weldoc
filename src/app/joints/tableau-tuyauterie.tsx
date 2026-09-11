type JointTuyauterie = {
  id: string;
  numero: string;
  indiceReparation: number;
  ligne: string | null;
  spool: string | null;
  typeJoint: string | null;
  dn: string | null;
  repereCroquis: string | null;
  diametre: number | null;
  epaisseur: number | null;
  matiere: { designation: string; nuance: string; diametre: number | null; epaisseur: number | null } | null;
  soudeur: { nom: string; prenom: string } | null;
  wpsReference: string | null;
  wps: {
    reference: string;
    groupeMateriaux: string | null;
    passes: { metalApportType: string | null; metalApportDesignationNormalisee: string | null }[];
  } | null;
  qmosReference: string | null;
  qsReference: string | null;
};

function formatNombre(valeur: number | null): string {
  return valeur !== null ? `${valeur}` : "—";
}

// Tableau des joints d'une affaire, une ligne par joint, qui regroupe les
// caractéristiques de la tuyauterie (ligne/spool, DN, diamètre, épaisseur,
// matière, WPS/QMOS/QS, groupe matériaux, métal d'apport) — jusqu'ici, ces
// informations n'étaient visibles qu'en ouvrant chaque fiche de joint une
// par une. Rien de nouveau n'est saisi ici : chaque colonne reprend une
// donnée déjà enregistrée ailleurs (matière/CCPU, WPS de la bibliothèque),
// jamais ressaisie. Vue en plus, à côté des fiches détaillées ci-dessous
// (contrôles, signatures...), qui restent inchangées.
export function TableauTuyauterie({ joints }: { joints: JointTuyauterie[] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
        <thead>
          <tr>
            {[
              "Joint",
              "Repère",
              "Ligne / spool",
              "Type",
              "DN",
              "Ø (mm)",
              "Épaisseur (mm)",
              "Matière",
              "Groupe",
              "WPS",
              "Métal d'apport",
              "QMOS",
              "QS",
              "Soudeur",
            ].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  borderBottom: "2px solid var(--couleur-bordure)",
                  padding: "0.4rem 0.6rem",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {joints.map((j) => {
            const numeroAffiche = j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero;
            const diametre = j.diametre ?? j.matiere?.diametre ?? null;
            const epaisseur = j.epaisseur ?? j.matiere?.epaisseur ?? null;
            const wpsAffiche = j.wps?.reference ?? j.wpsReference;
            const premierePasse = j.wps?.passes[0];
            const metalApport = premierePasse?.metalApportDesignationNormalisee ?? premierePasse?.metalApportType ?? null;
            return (
              <tr key={j.id} style={{ borderBottom: "1px solid var(--couleur-fond-discret)" }}>
                <td style={{ padding: "0.4rem 0.6rem", fontWeight: 600 }}>{numeroAffiche}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{j.repereCroquis || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>
                  {j.ligne || "—"}
                  {j.spool && ` / ${j.spool}`}
                </td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{j.typeJoint || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{j.dn || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{formatNombre(diametre)}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{formatNombre(epaisseur)}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>
                  {j.matiere ? `${j.matiere.designation} (${j.matiere.nuance})` : "—"}
                </td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{j.wps?.groupeMateriaux || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{wpsAffiche || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{metalApport || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{j.qmosReference || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>{j.qsReference || "—"}</td>
                <td style={{ padding: "0.4rem 0.6rem" }}>
                  {j.soudeur ? `${j.soudeur.prenom} ${j.soudeur.nom}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
