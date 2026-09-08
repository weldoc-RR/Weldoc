import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

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
