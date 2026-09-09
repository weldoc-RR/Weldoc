import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";

const CreateSchema = z.object({
  reference: z.string().min(1),
  version: z.string().optional(),
  titre: z.string().min(1),
  categorie: z.string().optional(),
  url: z.string().min(1),
  dateDocument: z.string().datetime().optional(),
  // Liens multiples (voir le cahier des charges : "un document n'est
  // jamais téléchargé plusieurs fois pour plusieurs usages") — tous
  // optionnels, un même document peut concerner plusieurs éléments à la
  // fois.
  affaireIds: z.array(z.string()).optional(),
  jointIds: z.array(z.string()).optional(),
  phaseIds: z.array(z.string()).optional(),
  fncIds: z.array(z.string()).optional(),
  personnelIds: z.array(z.string()).optional(),
  outilIds: z.array(z.string()).optional(),
});

// GET /api/documents-externes?affaireId=...&jointId=...&phaseId=...&fncId=...&personnelId=...&outilId=...
// — bibliothèque documentaire (voir le cahier des charges, "DOCUMENTS
// EXTERNES ET BIBLIOTHÈQUE DOCUMENTAIRE"), statut "en vigueur/ancienne
// version/retirée" recalculé à la lecture (même principe que WPS/QMOS/
// ProcedureInterne).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const jointId = req.nextUrl.searchParams.get("jointId");
  const phaseId = req.nextUrl.searchParams.get("phaseId");
  const fncId = req.nextUrl.searchParams.get("fncId");
  const personnelId = req.nextUrl.searchParams.get("personnelId");
  const outilId = req.nextUrl.searchParams.get("outilId");

  const documents = await prisma.documentExterne.findMany({
    where: {
      affaires: affaireId ? { some: { id: affaireId } } : undefined,
      joints: jointId ? { some: { id: jointId } } : undefined,
      phases: phaseId ? { some: { id: phaseId } } : undefined,
      fncs: fncId ? { some: { id: fncId } } : undefined,
      personnel: personnelId ? { some: { id: personnelId } } : undefined,
      outils: outilId ? { some: { id: outilId } } : undefined,
    },
    include: {
      importePar: { select: { nom: true, prenom: true } },
      validePar: { select: { nom: true, prenom: true } },
      affaires: { select: { id: true, numero: true } },
      joints: { select: { id: true, numero: true, indiceReparation: true } },
      phases: { select: { id: true, nom: true } },
      fncs: { select: { id: true, reference: true } },
      personnel: { select: { id: true, nom: true, prenom: true } },
      outils: { select: { id: true, reference: true } },
    },
    orderBy: [{ reference: "asc" }, { dateImport: "desc" }],
  });
  return NextResponse.json(annoterStatutProcedures(documents, (d) => d.dateImport));
}

// POST /api/documents-externes — importe un document (niveau 2 minimum).
// L'importeur est toujours la personne authentifiée.
export async function POST(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { dateDocument, affaireIds, jointIds, phaseIds, fncIds, personnelIds, outilIds, ...reste } = parsed.data;

  // Écritures séquentielles plutôt qu'une création imbriquée : le pilote
  // HTTPS utilisé pour joindre la base ne supporte pas les transactions,
  // or même un seul `connect` sur une relation implicite plusieurs-à-
  // plusieurs en ouvre une côté Prisma (voir la remarque dans
  // src/lib/prisma.ts). On crée d'abord le document seul, puis on relie
  // chaque élément par une requête SQL directe sur la table de jointure
  // implicite (noms de tables et ordre A/B confirmés par la migration :
  // toujours le modèle le premier alphabétiquement en A).
  const document = await prisma.documentExterne.create({
    data: {
      ...reste,
      dateDocument: dateDocument ? new Date(dateDocument) : undefined,
      importeParId: droits.utilisateur.personnelId,
    },
  });

  for (const id of affaireIds ?? []) {
    await prisma.$executeRaw`INSERT INTO "_AffaireToDocumentExterne" ("A", "B") VALUES (${id}, ${document.id}) ON CONFLICT DO NOTHING`;
  }
  for (const id of jointIds ?? []) {
    await prisma.$executeRaw`INSERT INTO "_DocumentExterneToJoint" ("A", "B") VALUES (${document.id}, ${id}) ON CONFLICT DO NOTHING`;
  }
  for (const id of phaseIds ?? []) {
    await prisma.$executeRaw`INSERT INTO "_DocumentExterneToPhase" ("A", "B") VALUES (${document.id}, ${id}) ON CONFLICT DO NOTHING`;
  }
  for (const id of fncIds ?? []) {
    await prisma.$executeRaw`INSERT INTO "_DocumentExterneToFNC" ("A", "B") VALUES (${document.id}, ${id}) ON CONFLICT DO NOTHING`;
  }
  for (const id of personnelIds ?? []) {
    await prisma.$executeRaw`INSERT INTO "_PersonnelConcerneDocumentExterne" ("A", "B") VALUES (${document.id}, ${id}) ON CONFLICT DO NOTHING`;
  }
  for (const id of outilIds ?? []) {
    await prisma.$executeRaw`INSERT INTO "_DocumentExterneToOutil" ("A", "B") VALUES (${document.id}, ${id}) ON CONFLICT DO NOTHING`;
  }

  return NextResponse.json(document, { status: 201 });
}

const RetirerSchema = z.object({
  id: z.string().min(1),
  retiree: z.boolean(),
});

// PATCH /api/documents-externes — marque un document comme retiré ou le
// réactive ; ne modifie jamais son contenu ni ses liens.
export async function PATCH(req: NextRequest) {
  const droits = await requireNiveau(req, "NIVEAU_2");
  if ("erreur" in droits) return droits.erreur;

  const body = await req.json();
  const parsed = RetirerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const document = await prisma.documentExterne.update({
    where: { id: parsed.data.id },
    data: { retiree: parsed.data.retiree },
  });
  return NextResponse.json(document);
}
