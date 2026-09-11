import { prisma } from "@/lib/prisma";

type MatiereRecue = {
  affaireId: string;
  normeProduit: string;
  nuance: string;
  diametre?: number | null;
  epaisseur?: number | null;
};

const normalise = (s: string) => s.trim().toLowerCase();

// Vérifie la conformité d'une matière réceptionnée par rapport à ce qui
// était commandé/prévu pour l'affaire (voir MatierePrevue dans
// schema.prisma, saisi une seule fois par l'encadrement). Ne bloque
// jamais la réception : les alertes sont indicatives, la décision de
// passer outre reste humaine — même principe que evaluerAffectation.
// Tant que rien n'a été déclaré comme prévu pour l'affaire, aucune
// alerte n'est levée (comportement additif/optionnel, comme les
// autorisations de signature).
export async function verifierConformiteMatiere(matiere: MatiereRecue): Promise<string[]> {
  const prevues = await prisma.matierePrevue.findMany({ where: { affaireId: matiere.affaireId } });
  if (prevues.length === 0) return [];

  const correspondance = prevues.find(
    (p) => normalise(p.normeProduit) === normalise(matiere.normeProduit) && normalise(p.nuance) === normalise(matiere.nuance)
  );

  if (!correspondance) {
    const attendu = prevues.map((p) => `${p.normeProduit} / ${p.nuance}`).join(", ");
    return [`Norme/nuance non prévue pour cette affaire (reçu : ${matiere.normeProduit} / ${matiere.nuance} — attendu : ${attendu}).`];
  }

  const alertes: string[] = [];
  if (correspondance.diametre != null && matiere.diametre != null && correspondance.diametre !== matiere.diametre) {
    alertes.push(`Diamètre différent de celui prévu (reçu : ${matiere.diametre} mm — prévu : ${correspondance.diametre} mm).`);
  }
  if (correspondance.epaisseur != null && matiere.epaisseur != null && correspondance.epaisseur !== matiere.epaisseur) {
    alertes.push(`Épaisseur différente de celle prévue (reçu : ${matiere.epaisseur} mm — prévu : ${correspondance.epaisseur} mm).`);
  }
  return alertes;
}
