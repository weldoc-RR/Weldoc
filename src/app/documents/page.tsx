import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { annoterStatutProcedures, type StatutAffichageProcedure } from "@/lib/procedures";
import { AjouterDocumentExterne } from "./ajouter-document-externe";
import { ValiderDocumentExterne } from "./valider-document-externe";
import { RetirerProcedure } from "../procedures/retirer-procedure";

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
      style={{ fontSize: "0.75rem", color: "#fff", background: COULEUR_STATUT[statut], borderRadius: 4, padding: "0.1rem 0.4rem", marginLeft: "0.5rem" }}
    >
      {LIBELLE_STATUT[statut]}
    </span>
  );
}

// Documents externes et bibliothèque documentaire (voir le cahier des
// charges, "DOCUMENTS EXTERNES ET BIBLIOTHÈQUE DOCUMENTAIRE") : documents
// de fournisseurs/sous-traitants/prestataires CND ou traitement
// thermique/organismes externes, liés à plusieurs éléments à la fois —
// distinct des PV externes (toujours rattachés à une seule affaire).
export default async function DocumentsExternesPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [documentsList, affaires, joints, phases, fncs, personnel, outils] = await Promise.all([
    prisma.documentExterne.findMany({
      include: {
        importePar: { select: { nom: true, prenom: true } },
        validePar: { select: { nom: true, prenom: true } },
        affaires: { select: { id: true, numero: true } },
        joints: { select: { id: true, numero: true, indiceReparation: true } },
        phases: { select: { id: true, nom: true } },
        fncs: { select: { id: true, reference: true } },
        personnel: { select: { id: true, nom: true, prenom: true } },
        outils: { select: { id: true, reference: true } },
      },
      orderBy: [{ reference: "asc" }, { dateImport: "desc" }],
    }),
    prisma.affaire.findMany({ select: { id: true, numero: true }, orderBy: { numero: "asc" } }),
    prisma.joint.findMany({ select: { id: true, numero: true, indiceReparation: true }, orderBy: { numero: "asc" } }),
    prisma.phase.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    prisma.fNC.findMany({ select: { id: true, reference: true }, orderBy: { reference: "asc" } }),
    prisma.personnel.findMany({ select: { id: true, nom: true, prenom: true }, orderBy: { nom: "asc" } }),
    prisma.outil.findMany({ select: { id: true, reference: true }, orderBy: { reference: "asc" } }),
  ]);
  const documentsAnnotes = annoterStatutProcedures(documentsList, (d) => d.dateImport);
  const peutValider = aNiveauMinimum(utilisateur.niveau, "NIVEAU_3");

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Documents externes</h1>
      <p style={{ fontSize: "0.9rem", color: "#52514e" }}>
        Documents de fournisseurs, sous-traitants, prestataires CND ou traitement thermique, organismes externes.
        Un même document se relie à plusieurs affaires/joints/phases/FNC/personnel/équipements plutôt que d&apos;être
        réimporté pour chaque usage. Une nouvelle révision (Rev 1, Rev 2...) ne remplace jamais la précédente.
      </p>

      <AjouterDocumentExterne
        affaires={affaires.map((a) => ({ id: a.id, label: a.numero }))}
        joints={joints.map((j) => ({ id: j.id, label: j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero }))}
        phases={phases.map((p) => ({ id: p.id, label: p.nom }))}
        fncs={fncs.map((f) => ({ id: f.id, label: f.reference }))}
        personnel={personnel.map((p) => ({ id: p.id, label: `${p.prenom} ${p.nom}` }))}
        outils={outils.map((o) => ({ id: o.id, label: o.reference }))}
      />

      {documentsAnnotes.length === 0 ? (
        <p>Aucun document importé pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {documentsAnnotes.map((d) => (
            <li key={d.id} style={{ marginBottom: "1rem", border: "1px solid #ddd", padding: "0.75rem" }}>
              <strong>{d.reference}</strong> ({d.version}) — {d.titre}
              {d.categorie && ` — ${d.categorie}`}
              <BadgeStatut statut={d.statutAffiche} />
              <RetirerProcedure endpoint="/api/documents-externes" id={d.id} retiree={d.retiree} />
              <div style={{ fontSize: "0.85rem", color: "#52514e", marginTop: "0.2rem" }}>
                Importé par {d.importePar.prenom} {d.importePar.nom} le {d.dateImport.toLocaleDateString("fr-FR")}
                {d.dateDocument && ` — document daté du ${d.dateDocument.toLocaleDateString("fr-FR")}`} —{" "}
                <a href={d.url} target="_blank" rel="noopener noreferrer">
                  voir le document
                </a>
              </div>
              {(d.affaires.length > 0 || d.joints.length > 0 || d.phases.length > 0 || d.fncs.length > 0 || d.personnel.length > 0 || d.outils.length > 0) && (
                <div style={{ fontSize: "0.8rem", color: "#898781", marginTop: "0.2rem" }}>
                  {d.affaires.length > 0 && <>Affaires : {d.affaires.map((a) => a.numero).join(", ")} — </>}
                  {d.joints.length > 0 && (
                    <>Joints : {d.joints.map((j) => (j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero)).join(", ")} — </>
                  )}
                  {d.phases.length > 0 && <>Phases : {d.phases.map((p) => p.nom).join(", ")} — </>}
                  {d.fncs.length > 0 && <>FNC : {d.fncs.map((f) => f.reference).join(", ")} — </>}
                  {d.personnel.length > 0 && <>Personnel : {d.personnel.map((p) => `${p.prenom} ${p.nom}`).join(", ")} — </>}
                  {d.outils.length > 0 && <>Équipements : {d.outils.map((o) => o.reference).join(", ")}</>}
                </div>
              )}
              {d.valideConclusion ? (
                <p style={{ fontSize: "0.85rem", color: d.valideConclusion === "CONFORME" ? "#0ca30c" : "crimson", marginTop: "0.3rem" }}>
                  Validé par {d.validePar?.prenom} {d.validePar?.nom} le {d.dateValidation?.toLocaleDateString("fr-FR")} —{" "}
                  {d.valideConclusion === "CONFORME" ? "conforme" : "non conforme"}
                  {d.valideCommentaire && ` — ${d.valideCommentaire}`}
                </p>
              ) : peutValider ? (
                <ValiderDocumentExterne documentId={d.id} />
              ) : (
                <p style={{ fontSize: "0.85rem", color: "#898781", marginTop: "0.3rem" }}>Pas encore validé (réservé au niveau 3).</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
