import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { creerSignature } from "@/lib/signature";

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
// que la charte en vigueur a été acceptée → signature horodatée (voir
// src/lib/signature.ts). Le QR seul n'est jamais une signature (il est
// prêtable/copiable) : le PIN est systématiquement requis. Une session
// ouverte sur l'appareil reste nécessaire (requireAuth) pour appeler cette
// route, mais la personne qui SIGNE peut être différente de celle
// connectée : c'est le principe d'une tablette partagée où chacun
// s'identifie par QR + PIN pour ses propres actes, sans se reconnecter.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = SignerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const resultat = await creerSignature(parsed.data);
  if (!resultat.ok) {
    return NextResponse.json({ error: resultat.erreur }, { status: resultat.statut });
  }

  return NextResponse.json({ signature: resultat.signature, personnel: resultat.personnel }, { status: 201 });
}
