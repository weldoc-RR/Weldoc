import { prisma } from "@/lib/prisma";
import { correspondFonction, FONCTION_SOUDEUR } from "@/lib/verificationRole";

export type JointRoleNonCorrespondant = {
  jointId: string;
  numero: string;
  affaireId: string;
  affaireNumero: string;
  soudeurNom: string;
};

// Alerte "rôle ne correspond pas à l'action" (voir src/lib/verificationRole.ts) :
// pour l'instant, seul le rapprochement soudeur/joint est câblé — c'est le
// seul endroit où l'identité de la personne qui a réalisé l'action est déjà
// affichée joint par joint (voir /joints). Additif comme les autres alertes
// indicatives : un joint sans soudeur désigné n'apparaît jamais ici.
export async function rolesNonCorrespondants(): Promise<JointRoleNonCorrespondant[]> {
  const joints = await prisma.joint.findMany({
    where: { soudeurId: { not: null }, indiceReparation: 0 },
    select: {
      id: true,
      numero: true,
      affaire: { select: { id: true, numero: true } },
      soudeur: { select: { nom: true, prenom: true, fonctions: { select: { fonction: true } } } },
    },
  });

  const resultat: JointRoleNonCorrespondant[] = [];
  for (const joint of joints) {
    if (!joint.soudeur) continue;
    const fonctions = joint.soudeur.fonctions.map((f) => f.fonction);
    if (!correspondFonction(fonctions, FONCTION_SOUDEUR)) {
      resultat.push({
        jointId: joint.id,
        numero: joint.numero,
        affaireId: joint.affaire.id,
        affaireNumero: joint.affaire.numero,
        soudeurNom: `${joint.soudeur.prenom} ${joint.soudeur.nom}`,
      });
    }
  }
  return resultat;
}
