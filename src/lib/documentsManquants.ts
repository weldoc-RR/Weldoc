import { prisma } from "@/lib/prisma";

// Types de document reconnus. Chacun correspond à un champ déjà existant
// ailleurs dans le modèle — cette fonction ne fait que vérifier sa
// présence, jamais son contenu ni sa conformité.
export const SIGLES_DOCUMENT = ["FICHE_SOUDAGE", "CCPU_MATIERE", "CERTIFICAT_MATIERE", "TQC"] as const;
export type SigleDocument = (typeof SIGLES_DOCUMENT)[number];

export const LIBELLES_DOCUMENT: Record<SigleDocument, string> = {
  FICHE_SOUDAGE: "fiche technique de suivi de soudage",
  CCPU_MATIERE: "CCPU de la matière",
  CERTIFICAT_MATIERE: "certificat de la matière",
  TQC: "TQC (tel que construit)",
};

export type JointDocumentsManquants = {
  jointId: string;
  numero: string;
  affaireId: string;
  affaireNumero: string;
  manquants: SigleDocument[];
};

// Alerte "documents manquants" (voir le cahier des charges, "ALERTES") :
// compare, pour chaque affaire ayant déclaré des documents requis
// (Affaire.documentsRequis, saisi une seule fois — voir /affaires/[id]/
// reglementaire), les documents réellement déposés/renseignés sur chaque
// joint d'origine (les réparations ne sont pas comptées, même principe
// que l'avancement joint par joint et les contrôles manquants). Purement
// indicatif, jamais bloquant, et additif : une affaire qui n'a rien
// déclaré n'apparaît jamais dans cette liste.
export async function documentsManquants(): Promise<JointDocumentsManquants[]> {
  const affaires = await prisma.affaire.findMany({
    where: { documentsRequis: { isEmpty: false } },
    include: {
      joints: {
        where: { indiceReparation: 0 },
        select: {
          id: true,
          numero: true,
          ficheSoudageId: true,
          matiere: { select: { ccpuDocumentUrl: true, certificatUrl: true } },
          tqc: { select: { id: true } },
        },
      },
    },
  });

  const resultat: JointDocumentsManquants[] = [];
  for (const affaire of affaires) {
    const requis = affaire.documentsRequis.filter((d): d is SigleDocument => (SIGLES_DOCUMENT as readonly string[]).includes(d));
    for (const joint of affaire.joints) {
      const present: Record<SigleDocument, boolean> = {
        FICHE_SOUDAGE: joint.ficheSoudageId != null,
        CCPU_MATIERE: Boolean(joint.matiere?.ccpuDocumentUrl),
        CERTIFICAT_MATIERE: Boolean(joint.matiere?.certificatUrl),
        TQC: joint.tqc != null,
      };
      const manquants = requis.filter((sigle) => !present[sigle]);
      if (manquants.length > 0) {
        resultat.push({ jointId: joint.id, numero: joint.numero, affaireId: affaire.id, affaireNumero: affaire.numero, manquants });
      }
    }
  }
  return resultat;
}
