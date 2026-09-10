import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { AjouterPoint } from "./ajouter-point";
import { PointReglementaireCarte } from "./point-reglementaire";
import { ReferentielsAffaire } from "./referentiels-affaire";
import { ControlesRequis } from "./controles-requis";
import { DocumentsRequis } from "./documents-requis";
import { JointsPV } from "./joints-pv";
import { AnnexeIntervenants } from "./annexe-intervenants";
import { lignesJointsPV, annexeIntervenants } from "@/lib/contenuDossierReglementaire";

export const dynamic = "force-dynamic";

// Dossier réglementaire (voir le cahier des charges, "DOSSIER
// RÉGLEMENTAIRE" / "Blocage réglementaire") : distinct du rapport de fin
// de fabrication (compilation globale, /affaires/[id]/dossier). Alimenté
// uniquement par ce que le cahier des charges prévoit pour ce document
// (les PV déjà enregistrés, pas les rôles de l'affaire, qui relèvent de
// l'organigramme) : le tableau des joints avec leurs FTS et PV, une annexe
// "Qualifications et aptitudes des intervenants" (voir
// src/lib/contenuDossierReglementaire.ts — archive l'état au moment de la
// compilation, la vérification elle-même ayant déjà bloqué l'action en
// amont si besoin, voir src/lib/aptitudePersonnel.ts), les référentiels
// applicables, et le suivi des exigences réglementaires individuelles,
// avec historique de statut tracé (src/lib/dossierReglementaire.ts). Un
// point BLOQUANT empêche l'avancement de la phase concernée et la
// validation finale du rapport de fin de fabrication.
export default async function DossierReglementairePage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [affaire, points, joints, phases, tousReferentiels, liensReferentiels, lignesPV, intervenants] = await Promise.all([
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
    prisma.referentiel.findMany({ orderBy: { code: "asc" } }),
    prisma.affaireReferentiel.findMany({ where: { affaireId: params.id }, include: { referentiel: true } }),
    lignesJointsPV(params.id),
    annexeIntervenants(params.id),
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

      <h2 style={{ fontSize: "1.1rem" }}>Joints et procès-verbaux</h2>
      <p style={{ fontSize: "0.85rem", color: "#898781", margin: "0 0 0.5rem 0" }}>
        Compilé automatiquement à partir des fiches soudage (FTS) et des contrôles déjà enregistrés sur chaque
        joint — rien n&apos;est ressaisi ici.
      </p>
      <JointsPV lignes={lignesPV} />

      <ReferentielsAffaire
        affaireId={affaire.id}
        tous={tousReferentiels}
        lies={liensReferentiels.map((l) => l.referentiel)}
      />

      <ControlesRequis affaireId={affaire.id} valeurActuelle={affaire.controlesRequis} />

      <DocumentsRequis affaireId={affaire.id} valeurActuelle={affaire.documentsRequis} />

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

      <h2 style={{ fontSize: "1.1rem", marginTop: "2rem" }}>Annexe — Qualifications et aptitudes des intervenants</h2>
      <p style={{ fontSize: "0.85rem", color: "#898781", margin: "0 0 0.5rem 0" }}>
        État des qualifications (soudage/CND) et de l&apos;acuité visuelle des personnes ayant soudé ou réalisé un
        contrôle CND sur cette affaire, archivé pour le dossier transmis. La vérification (et le blocage si elle
        n&apos;était plus valide) a déjà eu lieu au moment de chaque action.
      </p>
      <AnnexeIntervenants intervenants={intervenants} />
    </main>
  );
}
