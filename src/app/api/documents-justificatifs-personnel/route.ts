import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";

const CreateSchema = z.object({
  personnelId: z.string().min(1),
  intitule: z.string().min(1),
  reference: z.string().optional(),
  documentUrl: z.string().min(1),
  dateDocument: z.string().datetime().optional(),
  dateExpiration: z.string().datetime().optional(),
});

// GET /api/documents-justificatifs-personnel?personnelId=... — documents
// justificatifs libres attachés à une personne (voir le cahier des
// charges, fiche personne : "..., documents justificatifs, ..."),
// au-delà des qualifications/habilitations/formations/acuités visuelles
// déjà modélisées (pièce d'identité, permis, CACES, autorisation
// spécifique...). Statut recalculé à la lecture, même principe que les
// habilitations.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const documents = await prisma.documentJustificatifPersonnel.findMany({
    where: { personnelId: personnelId ?? undefined },
    include: { ajoutePar: { select: { nom: true, prenom: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    documents.map((d) => ({
      ...d,
      statutCalcule: calculerStatut(d.dateExpiration, { suspendu: d.statut === "SUSPENDU" }),
    }))
  );
}

// POST /api/documents-justificatifs-personnel — ajoute un document
// justificatif (réservé au niveau 2 minimum, comme les habilitations).
// Même principe que les CCPU/documents externes : un lien vers un
// fichier déjà hébergé, pas de téléversement direct. Un renouvellement
// (nouvelle pièce, nouvelle échéance) se fait en ajoutant un nouveau
// document, jamais en modifiant l'ancien.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateDocument, dateExpiration, ...reste } = parsed.data;

  const personnel = await prisma.personnel.findUnique({ where: { id: parsed.data.personnelId } });
  if (!personnel) {
    return NextResponse.json({ error: "Personnel introuvable." }, { status: 404 });
  }

  const document = await prisma.documentJustificatifPersonnel.create({
    data: {
      ...reste,
      dateDocument: dateDocument ? new Date(dateDocument) : undefined,
      dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
      ajouteParId: droits.utilisateur.personnelId,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
