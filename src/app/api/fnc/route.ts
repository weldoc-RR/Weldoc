import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

// GET /api/fnc?affaireId=... — liste les FNC (optionnellement filtrées par affaire)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const fncs = await prisma.fNC.findMany({
    where: affaireId ? { affaireId } : undefined,
    include: { joint: true },
    orderBy: { dateCreation: "desc" },
  });
  return NextResponse.json(fncs);
}

const UpdateFNCSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["DETECTION", "ANALYSE", "ACTION_CORRECTIVE", "CONTROLE", "VALIDATION", "CLOTUREE"]).optional(),
  actionCorrective: z.string().optional(),
});

// Faire passer une FNC en VALIDATION ou CLOTUREE est la décision de validation
// évoquée dans le cahier des charges : réservée au niveau 3, jamais prise par
// le moteur applicatif seul. Les autres étapes du workflow (analyse, action
// corrective, contrôle) restent accessibles à toute personne authentifiée.
const STATUTS_REQUERANT_NIVEAU_3 = new Set(["VALIDATION", "CLOTUREE"]);

// PATCH /api/fnc — fait avancer le workflow d'une FNC (détection → ... → clôture)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = UpdateFNCSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  const estValidation = updates.statut !== undefined && STATUTS_REQUERANT_NIVEAU_3.has(updates.statut);

  const auth = estValidation ? await requireNiveau(req, "NIVEAU_3") : await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;
  const { utilisateur } = auth;

  const fncAvant = await prisma.fNC.findUniqueOrThrow({ where: { id } });

  const fnc = await prisma.fNC.update({
    where: { id },
    data: {
      ...updates,
      // La personne qui valide/clôture est celle authentifiée, jamais une
      // valeur transmise par le client : la décision reste humaine et tracée.
      valideeParId: estValidation ? utilisateur.personnelId : undefined,
      dateCloture: updates.statut === "CLOTUREE" ? new Date() : undefined,
    },
  });

  if (estValidation) {
    await prisma.auditTrail.create({
      data: {
        utilisateurId: utilisateur.personnelId,
        entite: "FNC",
        entiteId: fnc.id,
        ancienneValeur: { statut: fncAvant.statut, valideeParId: fncAvant.valideeParId },
        nouvelleValeur: { statut: fnc.statut, valideeParId: fnc.valideeParId },
      },
    });
  }

  return NextResponse.json(fnc);
}
