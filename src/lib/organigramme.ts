import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";
import type { NiveauDecision, StatutValidite } from "@prisma/client";

export type PersonneOrganigramme = {
  personnel: { id: string; nom: string; prenom: string; niveau: NiveauDecision };
  jointNumero: string | null;
  dateDebut: Date;
  dateFin: Date;
  codes: string | null;
  present: boolean;
  habilitations: { intitule: string; statut: StatutValidite }[];
};

export type Organigramme = {
  affaire: { id: string; numero: string; client: string; projet: string };
  responsable: { id: string; nom: string; prenom: string } | null;
  chargeAffaires: { id: string; nom: string; prenom: string } | null;
  coordinateurSoudage: { id: string; nom: string; prenom: string } | null;
  equipeParFonction: { fonction: string; personnes: PersonneOrganigramme[] }[];
};

// Généré automatiquement à partir des rôles de l'affaire (responsable,
// chargé d'affaires, coordinateur soudage) et du planning (affectations
// actuellement actives — voir POST /api/affectations), sans rien stocker
// de son côté : il est donc toujours à jour, par construction, à chaque
// modification du planning (voir le cahier des charges, "ORGANIGRAMME
// CHANTIER" : "mis à jour à chaque modification pertinente du chantier").
// Utilisé par GET /api/affaires/[id]/organigramme (annexe du rapport de
// fin de fabrication) et par /affaires/[id]/organigramme (vue visuelle).
export async function construireOrganigramme(affaireId: string): Promise<Organigramme | null> {
  const affaire = await prisma.affaire.findUnique({ where: { id: affaireId } });
  if (!affaire) return null;

  const idsRoles = [affaire.responsableId, affaire.chargeAffairesId, affaire.coordinateurSoudageId].filter(
    (id): id is string => Boolean(id)
  );

  const [personnesRoles, affectationsActives] = await Promise.all([
    prisma.personnel.findMany({ where: { id: { in: idsRoles } } }),
    prisma.affectation.findMany({
      where: { affaireId: affaire.id, statut: { in: ["PLANIFIEE", "EN_COURS"] } },
      include: { personnel: { include: { habilitations: true } }, joint: { select: { numero: true } } },
      orderBy: { fonction: "asc" },
    }),
  ]);

  const trouver = (id: string | null) => personnesRoles.find((p) => p.id === id) ?? null;

  const parFonction = new Map<string, typeof affectationsActives>();
  for (const a of affectationsActives) {
    const liste = parFonction.get(a.fonction) ?? [];
    liste.push(a);
    parFonction.set(a.fonction, liste);
  }

  return {
    affaire: { id: affaire.id, numero: affaire.numero, client: affaire.client, projet: affaire.projet },
    responsable: trouver(affaire.responsableId),
    chargeAffaires: trouver(affaire.chargeAffairesId),
    coordinateurSoudage: trouver(affaire.coordinateurSoudageId),
    equipeParFonction: Array.from(parFonction.entries()).map(([fonction, affectations]) => ({
      fonction,
      personnes: affectations.map((a) => ({
        personnel: {
          id: a.personnel.id,
          nom: a.personnel.nom,
          prenom: a.personnel.prenom,
          niveau: a.personnel.niveau,
        },
        jointNumero: a.joint?.numero ?? null,
        dateDebut: a.dateDebut,
        dateFin: a.dateFin,
        codes: a.codes,
        present: a.statut === "EN_COURS",
        habilitations: a.personnel.habilitations.map((h) => ({
          intitule: h.intitule,
          statut: calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" }),
        })),
      })),
    })),
  };
}
