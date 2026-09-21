import { prisma } from "@/lib/prisma";

// La fiche de suivi d'activité d'une affaire est validée dès qu'une
// signature "FICHE_ACTIVITE" existe pour elle (voir POST
// /api/affaires/[id]/valider-fiche-activite) — aucun champ de statut
// dédié, la signature EST la preuve. Une fois validée, le séquencement
// des phases ne doit plus changer (voir POST/DELETE /api/phases) : la
// préparation reste stable une fois passée en production.
export async function ficheActiviteValidee(affaireId: string): Promise<boolean> {
  const validation = await prisma.signature.findFirst({
    where: { documentType: "FICHE_ACTIVITE", documentId: affaireId },
    select: { id: true },
  });
  return validation !== null;
}
