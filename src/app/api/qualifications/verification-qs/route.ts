import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";
import { verifierQS } from "@/lib/verificationQS";

// GET /api/qualifications/verification-qs?personnelId=...&wpsId=...
// Rapproche les qualifications soudage actives d'une personne (ni
// suspendues, ni expirées) avec le domaine d'un WPS, pour aider à vérifier
// — avant soudage — que la personne est bien qualifiée pour ce WPS. Un
// signal d'aide seulement : voir l'avertissement dans
// src/lib/verificationQS.ts, jamais une décision automatique.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const wpsId = req.nextUrl.searchParams.get("wpsId");
  if (!personnelId || !wpsId) {
    return NextResponse.json({ error: "personnelId et wpsId sont requis." }, { status: 400 });
  }

  const wps = await prisma.wps.findUnique({ where: { id: wpsId } });
  if (!wps) {
    return NextResponse.json({ error: "WPS introuvable." }, { status: 404 });
  }

  const qualifications = await prisma.qualification.findMany({
    where: { personnelId, type: "SOUDAGE" },
  });
  const qualificationsActives = qualifications.filter(
    (q) => calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }) !== "EXPIRE" && q.statut !== "SUSPENDU"
  );

  const resultat = verifierQS(qualificationsActives, wps);

  return NextResponse.json(resultat);
}
