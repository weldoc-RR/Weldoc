import { prisma } from "@/lib/prisma";
import type { StatutPointReglementaire } from "@prisma/client";

// Dossier réglementaire (voir le cahier des charges, "Blocage
// réglementaire") : 5 statuts possibles, mais le cahier des charges ne
// qualifie explicitement que "BLOQUANT" comme empêchant la poursuite
// ("Un point bloquant empêche la poursuite de la partie concernée").
// Lecture volontairement minimale : seul BLOQUANT bloque ; les autres
// statuts (sous réserve, attente décision, déblocage autorisé, non
// bloquant) sont des étapes du suivi, pas des blocages en soi. À ajuster
// si votre pratique réelle diffère (ex. "attente décision" devrait aussi
// bloquer).
export function pointBloque(statut: StatutPointReglementaire): boolean {
  return statut === "BLOQUANT";
}

// Statut actuel d'un point = son dernier événement (jamais stocké
// directement, comme pour les qualifications).
export function statutActuel(
  evenements: { statut: StatutPointReglementaire; date: Date }[]
): StatutPointReglementaire | null {
  if (evenements.length === 0) return null;
  return [...evenements].sort((a, b) => b.date.getTime() - a.date.getTime())[0].statut;
}

// Points bloquants (statut actuel BLOQUANT) qui concernent une affaire —
// affaire entière, ou un joint/une phase précis. Utilisé pour empêcher la
// validation du rapport de fin de fabrication (tous les points, quel que
// soit leur rattachement) et l'avancement d'une phase (points affectant
// cette affaire sans rattachement précis, ou cette phase précisément).
export async function pointsBloquants(
  affaireId: string,
  options: { phaseId?: string } = {}
): Promise<{ id: string; intitule: string }[]> {
  const points = await prisma.pointReglementaire.findMany({
    where: {
      affaireId,
      ...(options.phaseId ? { OR: [{ phaseId: null, jointId: null }, { phaseId: options.phaseId }] } : {}),
    },
    include: { evenements: { orderBy: { date: "desc" }, take: 1 } },
  });

  return points
    .filter((p) => p.evenements[0] && pointBloque(p.evenements[0].statut))
    .map((p) => ({ id: p.id, intitule: p.intitule }));
}
