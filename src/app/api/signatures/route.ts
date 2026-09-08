import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifierPin } from "@/lib/signature";

const SignerSchema = z.object({
  // Identifiant de la personne qui signe : matricule (saisie manuelle) ou
  // qrCodeValeur (scan). Volontairement permissif sur les deux pour
  // fonctionner aussi bien avec une douchette qu'une saisie clavier.
  identifiant: z.string().min(1),
  pin: z.string().min(1),
  documentType: z.string().min(1),
  documentId: z.string().min(1),
  versionDocument: z.string().min(1),
});

// POST /api/signatures — parcours complet demandé au cahier des charges :
// identification (QR ou matricule) → authentification (PIN) → contrôle
// que la charte en vigueur a été acceptée → signature horodatée. Le QR
// seul n'est jamais une signature (il est prêtable/copiable) : le PIN est
// systématiquement requis. Une session ouverte sur l'appareil reste
// nécessaire (requireAuth) pour appeler cette route, mais la personne qui
// SIGNE peut être différente de celle connectée : c'est le principe d'une
// tablette partagée où chacun s'identifie par QR + PIN pour ses propres
// actes, sans se reconnecter.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = SignerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { identifiant, pin, documentType, documentId, versionDocument } = parsed.data;

  const personnel = await prisma.personnel.findFirst({
    where: { OR: [{ matricule: identifiant }, { qrCodeValeur: identifiant }] },
  });
  if (!personnel) {
    return NextResponse.json({ error: "Personne introuvable (matricule ou QR non reconnu)." }, { status: 404 });
  }

  if (!personnel.pinHash) {
    return NextResponse.json(
      { error: `${personnel.prenom} ${personnel.nom} n'a pas encore défini de code PIN.` },
      { status: 422 }
    );
  }
  if (!(await verifierPin(pin, personnel.pinHash))) {
    return NextResponse.json({ error: "Code PIN incorrect." }, { status: 401 });
  }

  const derniereCharte = await prisma.chartVersion.findFirst({ orderBy: { publieLe: "desc" } });
  if (derniereCharte) {
    const acceptation = await prisma.chartAcceptation.findUnique({
      where: { personnelId_chartVersionId: { personnelId: personnel.id, chartVersionId: derniereCharte.id } },
    });
    if (!acceptation) {
      return NextResponse.json(
        {
          error: `${personnel.prenom} ${personnel.nom} doit d'abord accepter la charte d'utilisation en vigueur (version ${derniereCharte.version}).`,
        },
        { status: 422 }
      );
    }
  }

  const signature = await prisma.signature.create({
    data: { personnelId: personnel.id, documentType, documentId, versionDocument },
  });

  return NextResponse.json(
    { signature, personnel: { id: personnel.id, nom: personnel.nom, prenom: personnel.prenom } },
    { status: 201 }
  );
}
