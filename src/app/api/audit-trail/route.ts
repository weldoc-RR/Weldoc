import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/auth";

// GET /api/audit-trail?entite=...&entiteId=... — l'historique des
// modifications sensibles (voir le cahier des charges, "AUDIT TRAIL").
// Réservé au niveau 3 : c'est un outil de contrôle interne, pas une donnée
// opérationnelle courante. `entite`/`entiteId` restent des identifiants
// libres (pas de relation Prisma vers chaque type d'entité possible) : les
// noms des personnes sont résolus séparément ci-dessous.
export async function GET(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_3");
  if ("erreur" in droits) return droits.erreur;

  const entite = req.nextUrl.searchParams.get("entite");
  const entiteId = req.nextUrl.searchParams.get("entiteId");

  const entrees = await prisma.auditTrail.findMany({
    where: { entite: entite ?? undefined, entiteId: entiteId ?? undefined },
    orderBy: { date: "desc" },
    take: 200,
  });

  const personnel = await prisma.personnel.findMany({
    where: { id: { in: [...new Set(entrees.map((e) => e.utilisateurId))] } },
    select: { id: true, nom: true, prenom: true },
  });
  const personnelParId = new Map(personnel.map((p) => [p.id, p]));

  const donnees = entrees.map((e) => ({ ...e, utilisateur: personnelParId.get(e.utilisateurId) ?? null }));

  return NextResponse.json(donnees);
}
