import { prisma } from "@/lib/prisma";
import { calculerStatut } from "@/lib/statutValidite";

type EvaluationAffectation = {
  personnelId: string;
  fonction: string;
  dateDebut: Date;
  dateFin: Date;
  jointId?: string | null;
  affectationExclueId?: string; // pour ré-évaluer une affectation existante sans se signaler elle-même
};

// Fonctions liées à une qualification obligatoire, faute de modélisation plus
// fine (voir limite ci-dessous). Comparaison sur la valeur exacte de
// PersonnelFonction.fonction, qui est un texte libre.
const FONCTIONS_SOUDAGE = new Set(["soudeur"]);
const FONCTIONS_CND = new Set(["contrôleur cnd", "controleur cnd"]);

// Vérifie compétence, qualification, habilitation et disponibilité avant une
// affectation, comme demandé au cahier des charges. Ne bloque jamais :
// produit des alertes ("signale... peut proposer une affectation adaptée"),
// la décision de passer outre reste humaine.
//
// Limite assumée : la correspondance fonction → type de qualification requis
// est une liste en dur (soudeur → SOUDAGE, contrôleur CND → CND), pas encore
// une règle configurable par l'entreprise ; et on ne sait pas non plus
// quelle habilitation précise est requise pour quelle fonction, donc on se
// contente de signaler les habilitations déjà expirées, sans cibler celle
// qui bloquerait vraiment cette affectation.
export async function evaluerAffectation(params: EvaluationAffectation): Promise<string[]> {
  const alertes: string[] = [];

  const personnel = await prisma.personnel.findUnique({
    where: { id: params.personnelId },
    include: {
      fonctions: true,
      qualifications: { include: { evenements: { orderBy: { date: "desc" }, take: 1 } } },
      habilitations: true,
    },
  });

  if (!personnel) {
    alertes.push("Personnel introuvable.");
    return alertes;
  }

  const fonctionNormalisee = params.fonction.trim().toLowerCase();
  const aLaFonction = personnel.fonctions.some((f) => f.fonction.trim().toLowerCase() === fonctionNormalisee);
  if (!aLaFonction) {
    alertes.push(`Compétence manquante : cette personne n'a pas la fonction "${params.fonction}".`);
  }

  const typeQualificationRequis = FONCTIONS_SOUDAGE.has(fonctionNormalisee)
    ? "SOUDAGE"
    : FONCTIONS_CND.has(fonctionNormalisee)
      ? "CND"
      : null;

  if (typeQualificationRequis) {
    const qualifsPertinentes = personnel.qualifications.filter((q) => q.type === typeQualificationRequis);
    if (qualifsPertinentes.length === 0) {
      alertes.push(`Compétence manquante : aucune qualification ${typeQualificationRequis} enregistrée.`);
    } else {
      const statuts = qualifsPertinentes.map((q) => ({
        q,
        statut:
          q.evenements[0]?.type === "RECONDUCTION_PROPOSEE"
            ? "EN_RENOUVELLEMENT"
            : calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }),
      }));
      const auMoinsUneValide = statuts.some((s) => s.statut === "VALIDE" || s.statut === "BIENTOT_ECHEANCE");
      if (!auMoinsUneValide) {
        alertes.push(
          `Qualification ${typeQualificationRequis} expirée ou suspendue (aucune qualification valide pour cette fonction).`
        );
      }
      for (const { q, statut } of statuts) {
        if (statut === "BIENTOT_ECHEANCE") {
          alertes.push(
            `Qualification ${q.reference} (${q.norme}) bientôt à échéance` +
              (q.dateExpiration ? ` (${q.dateExpiration.toLocaleDateString("fr-FR")})` : "") +
              "."
          );
        }
      }
    }
  }

  for (const h of personnel.habilitations) {
    const statut = calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" });
    if (statut === "EXPIRE") {
      alertes.push(`Habilitation "${h.intitule}" expirée.`);
    }
  }

  const chevauche = (debutA: Date, finA: Date, debutB: Date, finB: Date) => debutA < finB && debutB < finA;

  const indisponibilites = await prisma.indisponibilite.findMany({ where: { personnelId: params.personnelId } });
  for (const i of indisponibilites) {
    if (chevauche(params.dateDebut, params.dateFin, i.dateDebut, i.dateFin)) {
      alertes.push(
        `Indisponibilité déclarée du ${i.dateDebut.toLocaleDateString("fr-FR")} au ` +
          `${i.dateFin.toLocaleDateString("fr-FR")} (${i.motif}).`
      );
    }
  }

  const autresAffectations = await prisma.affectation.findMany({
    where: {
      personnelId: params.personnelId,
      statut: { in: ["PLANIFIEE", "EN_COURS"] },
      id: params.affectationExclueId ? { not: params.affectationExclueId } : undefined,
    },
  });
  for (const a of autresAffectations) {
    if (chevauche(params.dateDebut, params.dateFin, a.dateDebut, a.dateFin)) {
      alertes.push(
        `Conflit de planning : déjà affecté(e) (${a.fonction}) du ${a.dateDebut.toLocaleDateString("fr-FR")} ` +
          `au ${a.dateFin.toLocaleDateString("fr-FR")}.`
      );
    }
  }

  return alertes;
}
