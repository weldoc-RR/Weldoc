import { prisma } from "@/lib/prisma";

// Sigles reconnus, mêmes que BadgeControle (src/app/joints/badge-controle.tsx).
export const SIGLES_CONTROLE = ["DIM", "VT", "PT", "MT", "RT", "UT"] as const;
export type SigleControle = (typeof SIGLES_CONTROLE)[number];

export type JointControlesManquants = {
  jointId: string;
  numero: string;
  affaireId: string;
  affaireNumero: string;
  manquants: SigleControle[];
};

// Alerte "contrôles manquants" (voir le cahier des charges, "ALERTES") :
// compare, pour chaque affaire ayant déclaré des contrôles requis
// (Affaire.controlesRequis, saisi une seule fois — voir /affaires/[id]/
// reglementaire), les contrôles réellement enregistrés sur chaque joint
// d'origine (les réparations ne sont pas comptées ici, même principe que
// l'avancement joint par joint). Purement indicatif, jamais bloquant, et
// additif : une affaire qui n'a rien déclaré n'apparaît jamais dans cette
// liste (comportement identique à MatierePrevue/AutorisationSignature).
export async function controlesManquants(): Promise<JointControlesManquants[]> {
  const affaires = await prisma.affaire.findMany({
    where: { controlesRequis: { isEmpty: false } },
    include: {
      joints: {
        where: { indiceReparation: 0 },
        select: {
          id: true,
          numero: true,
          controlesDim: { select: { id: true }, take: 1 },
          controlesVisuels: { select: { id: true }, take: 1 },
          controlesRessuage: { select: { id: true }, take: 1 },
          controlesMagnetoscopie: { select: { id: true }, take: 1 },
          controlesRadiographie: { select: { id: true }, take: 1 },
          controlesUltrasons: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  const resultat: JointControlesManquants[] = [];
  for (const affaire of affaires) {
    const requis = affaire.controlesRequis.filter((c): c is SigleControle => (SIGLES_CONTROLE as readonly string[]).includes(c));
    for (const joint of affaire.joints) {
      const present: Record<SigleControle, boolean> = {
        DIM: joint.controlesDim.length > 0,
        VT: joint.controlesVisuels.length > 0,
        PT: joint.controlesRessuage.length > 0,
        MT: joint.controlesMagnetoscopie.length > 0,
        RT: joint.controlesRadiographie.length > 0,
        UT: joint.controlesUltrasons.length > 0,
      };
      const manquants = requis.filter((sigle) => !present[sigle]);
      if (manquants.length > 0) {
        resultat.push({ jointId: joint.id, numero: joint.numero, affaireId: affaire.id, affaireNumero: affaire.numero, manquants });
      }
    }
  }
  return resultat;
}
