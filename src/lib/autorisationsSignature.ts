import { prisma } from "@/lib/prisma";

// "Contrôle des droits" du parcours de signature (voir le cahier des
// charges, "IDENTIFICATION ET SIGNATURE" : "identification QR →
// authentification personnelle (PIN) → contrôle des droits → signature →
// horodatage"), au-delà du niveau déjà vérifié par chaque route qui
// déclenche une signature. Si l'entreprise a nommé explicitement les
// personnes autorisées à signer un type de document (voir
// AutorisationSignature dans schema.prisma), seules ces personnes
// peuvent signer ce type-là ; sinon (aucune autorisation configurée pour
// ce type), le contrôle d'accès déjà en place ailleurs (niveau, sur
// chaque route) reste seul applicable — pas de blocage par défaut sur un
// type de document qui n'a jamais été configuré.
export async function personneAutoriseeASigner(personnelId: string, documentType: string): Promise<boolean> {
  const uneAutorisationExiste = await prisma.autorisationSignature.findFirst({
    where: { documentType, active: true },
    select: { id: true },
  });
  if (!uneAutorisationExiste) return true;

  const autorisationPersonne = await prisma.autorisationSignature.findUnique({
    where: { personnelId_documentType: { personnelId, documentType } },
  });
  return Boolean(autorisationPersonne?.active);
}
