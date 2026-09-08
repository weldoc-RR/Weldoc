import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreateDemandeSchema = z.object({
  affaireId: z.string().min(1),
  phasesConcerneesIds: z.array(z.string()).min(1),
  motif: z.string().min(1),
  urgent: z.boolean().optional(),
  photoUrl: z.string().optional(),
  documentUrl: z.string().optional(),
});

// GET /api/demandes-sequencement?affaireId=...&statut=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const statut = req.nextUrl.searchParams.get("statut");
  const demandes = await prisma.demandeModificationSequencement.findMany({
    where: {
      affaireId: affaireId ?? undefined,
      statut:
        statut === "EN_ATTENTE" || statut === "ACCEPTEE" || statut === "REFUSEE" || statut === "MODIFICATION_DEMANDEE"
          ? statut
          : undefined,
    },
    orderBy: { dateDemande: "desc" },
  });
  return NextResponse.json(demandes);
}

// POST /api/demandes-sequencement — l'intervenant sur le terrain demande à
// s'écarter du séquencement prévu : phases concernées, motif, urgence,
// photo/document à l'appui. Transmise automatiquement au niveau 3
// (visible via GET ?statut=EN_ATTENTE), qui décide ensuite (voir
// POST /api/demandes-sequencement/[id]/decision). N'importe quelle personne
// authentifiée peut la soumettre : c'est une demande, pas une décision.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateDemandeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const demande = await prisma.demandeModificationSequencement.create({
    data: { ...parsed.data, demandeParId: auth.utilisateur.personnelId },
  });

  return NextResponse.json(demande, { status: 201 });
}
