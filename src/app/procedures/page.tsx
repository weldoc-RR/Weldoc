import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { annoterStatutProcedures, type StatutAffichageProcedure } from "@/lib/procedures";
import { AjouterQmos } from "./ajouter-qmos";
import { AjouterWps } from "./ajouter-wps";
import { AjouterProcedureInterne } from "./ajouter-procedure-interne";
import { AjouterProduitDimensionnel } from "./ajouter-produit-dimensionnel";
import { RetirerProcedure } from "./retirer-procedure";

export const dynamic = "force-dynamic";

const LIBELLE_STATUT: Record<StatutAffichageProcedure, string> = {
  EN_VIGUEUR: "En vigueur",
  ANCIENNE_VERSION: "Ancienne version",
  RETIREE: "Retirée",
};
const COULEUR_STATUT: Record<StatutAffichageProcedure, string> = {
  EN_VIGUEUR: "#0ca30c",
  ANCIENNE_VERSION: "#898781",
  RETIREE: "#d03b3b",
};
const LIBELLE_TYPE_ASSEMBLAGE: Record<string, string> = {
  BOUT_A_BOUT: "Bout à bout",
  ANGLE: "Angle",
  EMMANCHE_SOUDE: "Emmanché-soudé",
  RECHARGEMENT: "Rechargement",
  AUTRE: "Autre",
};

function BadgeStatut({ statut }: { statut: StatutAffichageProcedure }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        color: "#fff",
        background: COULEUR_STATUT[statut],
        borderRadius: 4,
        padding: "0.1rem 0.4rem",
        marginLeft: "0.5rem",
      }}
    >
      {LIBELLE_STATUT[statut]}
    </span>
  );
}

export default async function ProceduresPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [wpsList, qmosList, procInternesList, produitsDimList, referentiels] = await Promise.all([
    prisma.wps.findMany({
      include: { qmos: { select: { reference: true, version: true } }, passes: { orderBy: { ordre: "asc" } } },
      orderBy: [{ reference: "asc" }, { dateEmission: "desc" }],
    }),
    prisma.qmos.findMany({ orderBy: [{ reference: "asc" }, { createdAt: "desc" }] }),
    prisma.procedureInterne.findMany({ orderBy: [{ reference: "asc" }, { dateEmission: "desc" }] }),
    prisma.produitDimensionnel.findMany({
      include: { referentiel: { select: { code: true, domaine: true } } },
      orderBy: [{ reference: "asc" }, { createdAt: "desc" }],
    }),
    prisma.referentiel.findMany({ select: { id: true, code: true, domaine: true }, orderBy: { code: "asc" } }),
  ]);
  const wpsAnnotes = annoterStatutProcedures(wpsList, (w) => w.dateEmission);
  const qmosAnnotes = annoterStatutProcedures(qmosList, (q) => q.dateEssai ?? q.createdAt);
  const qmosDisponibles = qmosAnnotes.filter((q) => q.statutAffiche !== "RETIREE");
  const procInternesAnnotees = annoterStatutProcedures(procInternesList, (p) => p.dateEmission);
  const produitsDimAnnotes = annoterStatutProcedures(produitsDimList, (p) => p.createdAt);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Procédures</h1>
      <p>
        Bibliothèque des procédures de soudage, réutilisables sur les joints plutôt que ressaisies à chaque fois.
        Une nouvelle révision (Rev 1, Rev 2...) ne remplace jamais la précédente : c&apos;est un nouvel
        enregistrement, et la version « en vigueur » est simplement la plus récente pour une même référence.
      </p>

      <h2>QMOS (qualification de mode opératoire de soudage)</h2>
      <AjouterQmos />
      {qmosAnnotes.length === 0 ? (
        <p>Aucune QMOS enregistrée pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
          {qmosAnnotes.map((q) => (
            <li key={q.id} style={{ marginBottom: "0.6rem", borderBottom: "1px solid #ddd", paddingBottom: "0.4rem" }}>
              <strong>{q.reference}</strong> ({q.version}) — {q.procede} — {q.normeReference}
              {q.laboratoire && ` — ${q.laboratoire}`}
              <BadgeStatut statut={q.statutAffiche} />
              <RetirerProcedure endpoint="/api/qmos" id={q.id} retiree={q.retiree} />
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: "2rem" }}>WPS / DMOS</h2>
      <AjouterWps qmosDisponibles={qmosDisponibles} />
      {wpsAnnotes.length === 0 ? (
        <p>Aucun WPS/DMOS enregistré pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
          {wpsAnnotes.map((w) => (
            <li key={w.id} style={{ marginBottom: "0.6rem", borderBottom: "1px solid #ddd", paddingBottom: "0.4rem" }}>
              <strong>{w.reference}</strong> ({w.version})
              {w.typeAssemblage && ` — ${LIBELLE_TYPE_ASSEMBLAGE[w.typeAssemblage]}`} — {w.procede} —{" "}
              {w.normeReference}
              {w.materiaux && ` — ${w.materiaux}`}
              {w.groupeMateriaux && ` — groupe matériau ${w.groupeMateriaux}`}
              {(w.epaisseurMinMm || w.epaisseurMaxMm) && (
                <> — épaisseur {w.epaisseurMinMm ?? "?"} à {w.epaisseurMaxMm ?? "?"} mm</>
              )}
              {(w.diametreMinMm || w.diametreMaxMm) && (
                <> — diamètre {w.diametreMinMm ?? "?"} à {w.diametreMaxMm ?? "?"} mm</>
              )}
              {w.qmos && ` — justifié par ${w.qmos.reference} (${w.qmos.version})`}
              <BadgeStatut statut={w.statutAffiche} />
              <RetirerProcedure endpoint="/api/wps" id={w.id} retiree={w.retiree} />
              {w.preparationNotes && (
                <div style={{ fontSize: "0.85rem", color: "#52514e", marginTop: "0.2rem" }}>
                  Préparation : {w.preparationNotes}
                </div>
              )}
              {w.passes.length > 0 && (
                <details style={{ marginTop: "0.3rem" }}>
                  <summary style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                    {w.passes.length} passe(s) — détail
                  </summary>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ fontSize: "0.8rem", borderCollapse: "collapse", marginTop: "0.3rem" }}>
                      <thead>
                        <tr>
                          {[
                            "N°",
                            "Procédé",
                            "Mode",
                            "Position",
                            "Métal d'apport",
                            "Ø (mm)",
                            "Gaz endroit",
                            "Courant",
                            "I (A)",
                            "U (V)",
                          ].map((th) => (
                            <th key={th} style={{ textAlign: "left", padding: "0.2rem 0.5rem", borderBottom: "1px solid #ddd" }}>
                              {th}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {w.passes.map((p) => (
                          <tr key={p.id}>
                            <td style={{ padding: "0.2rem 0.5rem" }}>{p.ordre}</td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>{p.procede}</td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>{p.modeOperatoire ?? "—"}</td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>{p.position ?? "—"}</td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>
                              {p.metalApportDesignationNormalisee ?? p.metalApportDesignationCommerciale ?? "—"}
                            </td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>{p.metalApportDiametreMm ?? "—"}</td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>{p.gazEndroitNature ?? "—"}</td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>{p.natureCourantPolarite ?? "—"}</td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>
                              {p.intensiteAMin || p.intensiteAMax ? `${p.intensiteAMin ?? "?"}–${p.intensiteAMax ?? "?"}` : "—"}
                            </td>
                            <td style={{ padding: "0.2rem 0.5rem" }}>
                              {p.tensionVMin || p.tensionVMax ? `${p.tensionVMin ?? "?"}–${p.tensionVMax ?? "?"}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: "2rem" }}>Procédures internes</h2>
      <p style={{ fontSize: "0.85rem", color: "#52514e" }}>
        Procédures, instructions, formulaires, PV types, fiches techniques... (voir le cahier des charges,
        "DOCUMENTATION ET PROCÉDURES INTERNES"). Une phase peut être reliée à une révision précise ici — c&apos;est
        ce lien qui conserve la version réellement utilisée à l&apos;exécution.
      </p>
      <AjouterProcedureInterne />
      {procInternesAnnotees.length === 0 ? (
        <p>Aucune procédure interne enregistrée pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
          {procInternesAnnotees.map((p) => (
            <li key={p.id} style={{ marginBottom: "0.6rem", borderBottom: "1px solid #ddd", paddingBottom: "0.4rem" }}>
              <strong>{p.reference}</strong> ({p.version}) — {p.titre}
              {p.type && ` — ${p.type}`}
              <BadgeStatut statut={p.statutAffiche} />
              <RetirerProcedure endpoint="/api/procedures-internes" id={p.id} retiree={p.retiree} />
              {p.documentUrl && (
                <div style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                  <a href={p.documentUrl} target="_blank" rel="noopener noreferrer">
                    voir le document
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: "2rem" }}>Bibliothèque dimensionnelle</h2>
      <p style={{ fontSize: "0.85rem", color: "#52514e" }}>
        Produits normalisés (tubes, tôles, raccords, brides...) avec leurs critères dimensionnels déjà déterminés
        depuis la norme réelle (voir le cahier des charges, "BIBLIOTHÈQUE DIMENSIONNELLE"). Sélectionnable au
        contrôle dimensionnel d&apos;un joint plutôt que de ressaisir norme/diamètre/épaisseur à chaque fois. Vise
        à terme à remplacer, référence par référence, le moteur de tolérances placeholder
        (<code>src/lib/tolerances.ts</code>).
      </p>
      <AjouterProduitDimensionnel referentiels={referentiels} />
      {produitsDimAnnotes.length === 0 ? (
        <p>Aucun produit enregistré pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
          {produitsDimAnnotes.map((p) => (
            <li key={p.id} style={{ marginBottom: "0.6rem", borderBottom: "1px solid #ddd", paddingBottom: "0.4rem" }}>
              <strong>{p.reference}</strong> ({p.version}) — {p.designation}
              {p.type && ` — ${p.type}`} — {p.normeProduit}
              {p.referentiel && ` — ${p.referentiel.code}`}
              <BadgeStatut statut={p.statutAffiche} />
              <RetirerProcedure endpoint="/api/produits-dimensionnels" id={p.id} retiree={p.retiree} />
              <div style={{ fontSize: "0.85rem", color: "#52514e", marginTop: "0.2rem" }}>
                Diamètre {p.diametreMiniMm} à {p.diametreMaxiMm} mm — épaisseur {p.epaisseurMiniMm} à{" "}
                {p.epaisseurMaxiMm} mm
                {p.finition && ` — finition ${p.finition}`}
                {p.etat && ` — état ${p.etat}`}
                {p.classeType && ` — ${p.classeType}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
