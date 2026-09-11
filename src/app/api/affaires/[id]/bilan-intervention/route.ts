import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const BilanSchema = z.object({
  entiteEmettrice: z.string().optional(),
  referenceOffreService: z.string().optional(),
  accessibilite: z.enum(["LIBRE", "INTERNE", "LIMITEE", "CONFIDENTIELLE"]).optional(),
  definitionIntervention: z.string().optional(),
  rexPosesDeposes: z.string().optional(),
  ecartsTravauxPrevusRealises: z.string().optional(),
  conformiteTravaux: z.string().optional(),
  bilanActionsRadioprotection: z.string().optional(),
  analyseEcartsRadioprotectionAmelioration: z.string().optional(),
  bonnesPratiques: z.string().optional(),
  dysfonctionnements: z.string().optional(),
  mesuresCorrectivesSuivantes: z.string().optional(),
});

// GET /api/affaires/[id]/bilan-intervention
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const bilan = await prisma.bilanIntervention.findUnique({ where: { affaireId: params.id } });
  return NextResponse.json(bilan);
}

// PATCH /api/affaires/[id]/bilan-intervention — contenu narratif du RFI
// (voir le modèle réel : définition, conformité des travaux, bilan
// radioprotection, REX...). Un seul enregistrement par affaire, mis à jour
// au fur et à mesure de la rédaction — la trace des évolutions se fait via
// POST /api/revisions-rfi, pas par un historique séparé pour chaque champ.
// Pas de .upsert() (pilote HTTPS, voir src/lib/prisma.ts) : recherche puis
// création ou mise à jour en écritures séquentielles.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = BilanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const existant = await prisma.bilanIntervention.findUnique({ where: { affaireId: params.id } });
  const bilan = existant
    ? await prisma.bilanIntervention.update({ where: { affaireId: params.id }, data: parsed.data })
    : await prisma.bilanIntervention.create({ data: { affaireId: params.id, ...parsed.data } });

  return NextResponse.json(bilan);
}
