import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { annoterStatutProcedures, type StatutAffichageProcedure } from "@/lib/procedures";
import { AjouterQmos } from "./ajouter-qmos";
import { AjouterWps } from "./ajouter-wps";
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

  const [wpsList, qmosList] = await Promise.all([
    prisma.wps.findMany({
      include: { qmos: { select: { reference: true, version: true } } },
      orderBy: [{ reference: "asc" }, { dateEmission: "desc" }],
    }),
    prisma.qmos.findMany({ orderBy: [{ reference: "asc" }, { createdAt: "desc" }] }),
  ]);
  const wpsAnnotes = annoterStatutProcedures(wpsList, (w) => w.dateEmission);
  const qmosAnnotes = annoterStatutProcedures(qmosList, (q) => q.dateEssai ?? q.createdAt);
  const qmosDisponibles = qmosAnnotes.filter((q) => q.statutAffiche !== "RETIREE");

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — WPS/DMOS et QMOS</h1>
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
              <strong>{w.reference}</strong> ({w.version}) — {w.procede} — {w.normeReference}
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
