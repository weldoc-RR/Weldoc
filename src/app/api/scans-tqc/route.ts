import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const CreateSchema = z.object({
  affaireId: z.string().min(1),
  zone: z.string().min(1),
  dateScan: z.string().datetime(),
  logiciel: z.string().optional(),
  versionLogiciel: z.string().optional(),
  fichierSourceUrl: z.string().min(1),
  fichierGenereUrl: z.string().optional(),
  isoResultantUrl: z.string().optional(),
  jointIds: z.array(z.string()).optional(),
});

// GET /api/scans-tqc?affaireId=...&jointId=... — deuxième méthode du TQC
// (voir le cahier des charges, "TQC (TEL QUE CONSTRUIT)" > "Scan 3D") :
// trace des scans externes déjà réalisés, complémentaire au TQC texte + book
// photo. Rien n'est jamais modifié après coup : un nouveau scan de la même
// zone est un nouvel enregistrement (pas de PATCH sur ce modèle).
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const jointId = req.nextUrl.searchParams.get("jointId");

  const scans = await prisma.scanTqc.findMany({
    where: {
      affaireId: affaireId ?? undefined,
      joints: jointId ? { some: { id: jointId } } : undefined,
    },
    include: {
      operateur: { select: { nom: true, prenom: true } },
      joints: { select: { id: true, numero: true, indiceReparation: true } },
    },
    orderBy: { dateScan: "desc" },
  });
  return NextResponse.json(scans);
}

// POST /api/scans-tqc — enregistre un scan 3D externe déjà réalisé.
// L'opérateur est toujours la personne connectée. Comme les CCPU/PV
// externes/documents externes, on ne conserve qu'un lien vers un fichier
// déjà hébergé — pas de téléversement direct dans Weldoc.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: parsed.data.affaireId } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const { jointIds, dateScan, ...reste } = parsed.data;

  // Création seule puis liens séquentiels sur la table de jointure
  // implicite (même contrainte HTTP/sans-transaction que documents
  // externes — voir /api/documents-externes) : `_JointToScanTqc`, Joint en
  // A (premier alphabétiquement), ScanTqc en B.
  const scan = await prisma.scanTqc.create({
    data: {
      ...reste,
      dateScan: new Date(dateScan),
      operateurId: auth.utilisateur.personnelId,
    },
  });

  for (const id of jointIds ?? []) {
    await prisma.$executeRaw`INSERT INTO "_JointToScanTqc" ("A", "B") VALUES (${id}, ${scan.id}) ON CONFLICT DO NOTHING`;
  }

  return NextResponse.json(scan, { status: 201 });
}
