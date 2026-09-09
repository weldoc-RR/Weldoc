import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";
import { tracerModification } from "@/lib/auditTrail";

// GET /api/personnel/[id] — fiche complète : identité, fonctions,
// qualifications (avec statut recalculé à partir des dates), habilitations,
// formations, acuités visuelles, statut du compte de connexion.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnel = await prisma.personnel.findUnique({
    where: { id: params.id },
    include: {
      fonctions: true,
      qualifications: { include: { evenements: { orderBy: { date: "desc" } } } },
      habilitations: true,
      formations: true,
      acuitesVisuelles: true,
      compte: { select: { statut: true, derniereConnexion: true } },
    },
  });

  if (!personnel) {
    return NextResponse.json({ error: "Personnel introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    ...personnel,
    qualifications: personnel.qualifications.map((q) => ({
      ...q,
      // Une reconduction proposée mais pas encore validée par le niveau 3
      // compétent est affichée "en renouvellement" plutôt que de laisser
      // deviner à partir de la seule date.
      statutCalcule:
        q.evenements[0]?.type === "RECONDUCTION_PROPOSEE"
          ? "EN_RENOUVELLEMENT"
          : calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }),
    })),
    habilitations: personnel.habilitations.map((h) => ({
      ...h,
      statutCalcule: calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" }),
    })),
    formations: personnel.formations.map((f) => ({
      ...f,
      statutCalcule: calculerStatut(f.dateExpiration, { suspendu: f.statut === "SUSPENDU" }),
    })),
    acuitesVisuelles: personnel.acuitesVisuelles.map((a) => ({
      ...a,
      statutCalcule: calculerStatut(a.dateExpiration, { suspendu: a.statut === "SUSPENDU" }),
    })),
  });
}

const UpdateNiveauSchema = z.object({
  niveau: z.enum(["NIVEAU_1", "NIVEAU_2", "NIVEAU_3"]),
});

// PATCH /api/personnel/[id] — change le niveau de décision d'une personne
// (voir le cahier des charges, "DROITS ET MODIFICATIONS"). Réservé au
// niveau 3. Ne modifie rien d'autre sur la fiche ; tracé par l'audit
// trail (voir src/lib/auditTrail.ts), comme demandé au cahier des charges
// ("un niveau 3 ne supprime jamais l'historique").
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = UpdateNiveauSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const avant = await prisma.personnel.findUnique({ where: { id: params.id } });
  if (!avant) {
    return NextResponse.json({ error: "Personnel introuvable." }, { status: 404 });
  }

  const personnel = await prisma.personnel.update({ where: { id: params.id }, data: { niveau: parsed.data.niveau } });

  if (avant.niveau !== personnel.niveau) {
    await tracerModification({
      utilisateurId: droits.utilisateur.personnelId,
      entite: "Personnel",
      entiteId: personnel.id,
      ancienneValeur: { niveau: avant.niveau },
      nouvelleValeur: { niveau: personnel.niveau },
    });
  }

  return NextResponse.json(personnel);
}
