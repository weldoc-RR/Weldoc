import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { AjouterPvExterne } from "./ajouter-pv-externe";
import { RevuePvExterne } from "./revue-pv-externe";

export const dynamic = "force-dynamic";

// PV externes (voir le cahier des charges, "PV EXTERNES") : documents
// produits par un prestataire externe, importés et liés à cette affaire
// et, optionnellement, à un joint ou une phase précis — avec une revue
// tracée par une personne habilitée (niveau 3).
export default async function PvExternesPage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [affaire, pvExternes, joints, phases] = await Promise.all([
    prisma.affaire.findUnique({ where: { id: params.id } }),
    prisma.pVExterne.findMany({
      where: { affaireId: params.id },
      include: {
        importePar: { select: { nom: true, prenom: true } },
        revuePar: { select: { nom: true, prenom: true } },
        joint: { select: { numero: true, indiceReparation: true } },
        phase: { select: { nom: true } },
      },
      orderBy: { dateImport: "desc" },
    }),
    prisma.joint.findMany({ where: { affaireId: params.id }, select: { id: true, numero: true, indiceReparation: true } }),
    prisma.phase.findMany({ where: { sequence: { affaireId: params.id } }, select: { id: true, nom: true } }),
  ]);
  if (!affaire) {
    notFound();
  }

  const peutReviser = aNiveauMinimum(utilisateur.niveau, "NIVEAU_3");

  return (
    <main style={{ padding: "2rem", maxWidth: 900 }}>
      <p>
        <Link href={`/affaires/${affaire.id}/dossier`}>Rapport de fin de fabrication →</Link>
      </p>
      <h1 style={{ marginBottom: "0.25rem" }}>PV externes — {affaire.numero}</h1>
      <p style={{ color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        {affaire.client} / {affaire.projet}
      </p>

      <AjouterPvExterne
        affaireId={affaire.id}
        joints={joints.map((j) => ({ id: j.id, numeroAffiche: j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero }))}
        phases={phases}
      />

      {pvExternes.length === 0 ? (
        <p>Aucun document externe importé pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {pvExternes.map((pv) => (
            <li key={pv.id} style={{ marginBottom: "1rem", border: "1px solid #ddd", padding: "0.75rem" }}>
              <strong>{pv.intitule}</strong>
              {pv.prestataire && ` — ${pv.prestataire}`}
              {pv.joint && ` — joint ${pv.joint.numero}${pv.joint.indiceReparation > 0 ? ` R${pv.joint.indiceReparation}` : ""}`}
              {pv.phase && ` — phase ${pv.phase.nom}`}
              <div style={{ fontSize: "0.85rem", color: "#52514e" }}>
                Importé par {pv.importePar.prenom} {pv.importePar.nom} le {pv.dateImport.toLocaleDateString("fr-FR")}
                {pv.dateDocument && ` — document daté du ${pv.dateDocument.toLocaleDateString("fr-FR")}`} —{" "}
                <a href={pv.url} target="_blank" rel="noopener noreferrer">
                  voir le document
                </a>
              </div>
              {pv.revueConclusion ? (
                <p style={{ fontSize: "0.85rem", color: pv.revueConclusion === "CONFORME" ? "#0ca30c" : "crimson" }}>
                  Revu par {pv.revuePar?.prenom} {pv.revuePar?.nom} le {pv.dateRevue?.toLocaleDateString("fr-FR")} —{" "}
                  {pv.revueConclusion === "CONFORME" ? "conforme" : "non conforme"}
                  {pv.revueCommentaire && ` — ${pv.revueCommentaire}`}
                </p>
              ) : peutReviser ? (
                <RevuePvExterne pvExterneId={pv.id} />
              ) : (
                <p style={{ fontSize: "0.85rem", color: "#898781" }}>Pas encore revu (réservé au niveau 3).</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
