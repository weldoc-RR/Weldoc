import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";
import { verifierQS } from "@/lib/verificationQS";

// Quand un soudeur réalise un joint, on vérifie si cela peut constituer une
// preuve pour le maintien de l'une de ses qualifications soudage proche de
// l'échéance, comme demandé au cahier des charges. On se contente de le
// PROPOSER (RECONDUCTION_PROPOSEE) : Weldoc ne décide jamais seul qu'une
// qualification est reconduite, la validation reste faite par une personne
// de niveau 3 habilitée (voir POST /api/qualifications/[id]/evenements).
//
// Quand le joint a un WPS structuré (voir src/lib/verificationQS.ts), on ne
// propose que les qualifications dont le domaine couvre réellement ce WPS
// (procédé, groupe de matériaux, épaisseur, diamètre) — pas n'importe
// laquelle proche de l'échéance. Sans WPS structuré sur le joint (référence
// en texte libre, ou pas de WPS du tout), la correspondance ne peut pas
// être vérifiée automatiquement : on continue à proposer, mais en le
// signalant clairement dans le commentaire, pour que la personne qui valide
// sache qu'elle doit vérifier elle-même la pertinence.
//
// Important : ceci ne prolonge jamais une qualification au-delà de ce
// qu'autorise le référentiel de l'entreprise (ex. une qualification
// initiale à repasser tous les 3 ans, même si des reconductions par
// l'activité ont eu lieu entre-temps) — Weldoc ne connaît pas cette règle,
// propre à chaque référentiel/entreprise ; c'est à la personne qui valide
// une RECONDUCTION_VALIDEE de choisir la nouvelle échéance en conséquence.
export async function detecterPreuvesReconduction(soudeurId: string, jointId: string): Promise<void> {
  const joint = await prisma.joint.findUnique({ where: { id: jointId }, include: { wps: true } });

  const qualifications = await prisma.qualification.findMany({
    where: { personnelId: soudeurId, type: "SOUDAGE" },
    include: { evenements: { orderBy: { date: "desc" }, take: 1 } },
  });

  for (const qualification of qualifications) {
    const dejaProposee = qualification.evenements[0]?.type === "RECONDUCTION_PROPOSEE";
    if (dejaProposee) continue;

    const statut = calculerStatut(qualification.dateExpiration, {
      suspendu: qualification.statut === "SUSPENDU",
    });
    if (statut !== "BIENTOT_ECHEANCE") continue;

    let commentaire: string;
    if (joint?.wps) {
      const resultat = verifierQS([qualification], joint.wps);
      // Un écart constaté (mauvais procédé, épaisseur hors domaine...) veut
      // dire que ce joint ne prouve manifestement pas le maintien de CETTE
      // qualification : on ne le propose pas. Données insuffisantes pour
      // conclure (champs non renseignés d'un côté ou de l'autre) n'est pas
      // un écart : on propose quand même, avec la réserve habituelle.
      if (resultat.statut === "NON_COUVERT") continue;
      commentaire =
        resultat.statut === "COUVERT"
          ? "Proposition automatique : qualification proche de l'échéance, et le WPS de ce joint " +
            `(${joint.wps.reference} ${joint.wps.version}) correspond à son domaine (procédé/groupe de matériaux/` +
            "épaisseur/diamètre). À valider par une personne habilitée."
          : "Proposition automatique : qualification proche de l'échéance et activité de soudage détectée. " +
            "La correspondance avec le domaine de la qualification n'a pas pu être vérifiée automatiquement " +
            "(données insuffisantes) — à vérifier par une personne habilitée avant validation.";
    } else {
      commentaire =
        "Proposition automatique : qualification proche de l'échéance et activité de soudage détectée. " +
        "Ce joint n'a pas de WPS structuré : la correspondance avec le domaine de la qualification n'a pas " +
        "pu être vérifiée automatiquement — à vérifier par une personne habilitée avant validation.";
    }

    await prisma.qualificationEvenement.create({
      data: {
        qualificationId: qualification.id,
        type: "RECONDUCTION_PROPOSEE",
        preuveJointIds: [jointId],
        commentaire,
      },
    });
  }
}
