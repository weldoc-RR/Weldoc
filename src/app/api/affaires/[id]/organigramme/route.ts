import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

// GET /api/affaires/[id]/organigramme — généré automatiquement à partir des
// rôles de l'affaire (responsable, chargé d'affaires, coordinateur soudage)
// et du planning (affectations actuellement actives — voir
// POST /api/affectations), sans rien stocker de son côté : il est donc
// toujours à jour, par construction, à chaque modification du planning.
// Pour chaque personne de l'équipe : ses codes d'habilitation/accès site
// (texte libre, jamais interprétés par Weldoc), si elle est actuellement
// présente sur le chantier (statut EN_COURS de son affectation), et le
// statut de ses habilitations — de quoi alimenter à la fois l'annexe
// organigramme et l'annexe habilitations du rapport de fin de fabrication.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

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

  return NextResponse.json({
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
  });
}
