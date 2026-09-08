import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { AjouterPoint } from "./ajouter-point";
import { PointReglementaireCarte } from "./point-reglementaire";

export const dynamic = "force-dynamic";

// Dossier réglementaire (voir le cahier des charges, "DOSSIER
// RÉGLEMENTAIRE" / "Blocage réglementaire") : distinct du rapport de fin
// de fabrication (compilation globale, /affaires/[id]/dossier). Ici,
// chaque exigence réglementaire est suivie individuellement, avec un
// historique de statut tracé (src/lib/dossierReglementaire.ts). Un point
// BLOQUANT empêche l'avancement de la phase concernée et la validation
// finale du rapport de fin de fabrication.
export default async function DossierReglementairePage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [affaire, points, joints, phases] = await Promise.all([
    prisma.affaire.findUnique({ where: { id: params.id } }),
    prisma.pointReglementaire.findMany({
      where: { affaireId: params.id },
      include: {
        joint: { select: { numero: true, indiceReparation: true } },
        phase: { select: { nom: true } },
        evenements: {
          orderBy: { date: "desc" },
          include: { auteur: { select: { nom: true, prenom: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.joint.findMany({ where: { affaireId: params.id }, select: { id: true, numero: true, indiceReparation: true } }),
    prisma.phase.findMany({ where: { sequence: { affaireId: params.id } }, select: { id: true, nom: true } }),
  ]);
  if (!affaire) {
    notFound();
  }

  const peutDebloquer = aNiveauMinimum(utilisateur.niveau, "NIVEAU_3");

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 900 }}>
      <p>
        <Link href="/">← Affaires</Link> · <Link href={`/affaires/${affaire.id}/dossier`}>Rapport de fin de fabrication →</Link>
      </p>
      <h1>Dossier réglementaire — {affaire.numero}</h1>
      <p>
        {affaire.client} / {affaire.projet}
      </p>
      <p style={{ fontSize: "0.85rem", color: "#898781" }}>
        Un point <strong style={{ color: "#d03b3b" }}>bloquant</strong> empêche l&apos;avancement de la phase
        concernée (ou de toutes les phases si le point n&apos;est rattaché à aucune phase précise) et la validation
        du rapport de fin de fabrication, tant qu&apos;il n&apos;est pas levé (passage en &laquo;&nbsp;déblocage
        autorisé&nbsp;&raquo;, réservé au niveau 3 et signé).
      </p>

      <AjouterPoint
        affaireId={affaire.id}
        joints={joints.map((j) => ({ id: j.id, numeroAffiche: j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero }))}
        phases={phases}
      />

      {points.length === 0 ? (
        <p>Aucun point réglementaire enregistré pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {points.map((p) => (
            <PointReglementaireCarte key={p.id} point={p} peutDebloquer={peutDebloquer} />
          ))}
        </ul>
      )}
    </main>
  );
}
