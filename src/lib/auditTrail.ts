import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Audit trail (voir le cahier des charges, "AUDIT TRAIL") : toute
// modification sensible historisée — utilisateur, date, entité concernée,
// ancienne/nouvelle valeur, motif. L'historique n'est jamais supprimé
// (aucune route de suppression n'existe sur AuditTrail).
//
// Ne duplique pas ce que des modèles déjà événementiels tracent déjà
// (QualificationEvenement, PointReglementaireEvenement, RevisionRFI...) :
// ceux-ci sont, chacun dans leur domaine, déjà un historique complet. Ce
// helper sert les modifications sensibles qui n'ont pas encore leur propre
// historique dédié (ex. avancement d'une phase).
export async function tracerModification(donnees: {
  utilisateurId: string;
  entite: string;
  entiteId: string;
  ancienneValeur?: Prisma.InputJsonValue;
  nouvelleValeur?: Prisma.InputJsonValue;
  motif?: string;
}) {
  await prisma.auditTrail.create({
    data: {
      utilisateurId: donnees.utilisateurId,
      entite: donnees.entite,
      entiteId: donnees.entiteId,
      ancienneValeur: donnees.ancienneValeur,
      nouvelleValeur: donnees.nouvelleValeur,
      motif: donnees.motif,
    },
  });
}
