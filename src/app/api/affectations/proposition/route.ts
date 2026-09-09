import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { proposerAffectation } from "@/lib/planning";

// GET /api/affectations/proposition?fonction=...&dateDebut=...&dateFin=...&jointId=...
// — voir le cahier des charges, "PLANNING" : "peut proposer une
// affectation adaptée". Classe les personnes ayant la fonction demandée
// par nombre d'alertes croissant (mêmes vérifications que
// POST /api/affectations) ; une proposition, jamais une décision.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const fonction = req.nextUrl.searchParams.get("fonction");
  const dateDebut = req.nextUrl.searchParams.get("dateDebut");
  const dateFin = req.nextUrl.searchParams.get("dateFin");
  const jointId = req.nextUrl.searchParams.get("jointId");

  if (!fonction || !dateDebut || !dateFin) {
    return NextResponse.json({ error: "fonction, dateDebut et dateFin sont requis." }, { status: 400 });
  }

  const propositions = await proposerAffectation({
    fonction,
    dateDebut: new Date(dateDebut),
    dateFin: new Date(dateFin),
    jointId: jointId || undefined,
  });

  return NextResponse.json(propositions);
}
