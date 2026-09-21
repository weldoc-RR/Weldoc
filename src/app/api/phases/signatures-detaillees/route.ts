import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { creerSignature } from "@/lib/signature";

const CreerSignatureDetailleeSchema = z.object({
  phaseId: z.string().min(1),
  fonction: z.enum(["EXECUTANT", "CONTROLEUR_TECHNIQUE", "SURVEILLANT", "VERIFICATEUR"]),
  habilitation: z.string().optional(),
  entrepriseService: z.string().optional(),
  identifiant: z.string().min(1),
  pin: z.string().min(1),
});

// POST /api/phases/signatures-detaillees — enregistre, pour une phase à
// contrôle technique (voir le cahier des charges, "FICHE DE SUIVI
// D'ACTIVITÉ AVEC CONTRÔLE TECHNIQUE PAR PHASE"), la signature d'une
// personne dans une fonction donnée (exécutant, contrôleur technique,
// surveillant, vérificateur), avec son habilitation/entreprise au
// moment de la signature — le nom vient de l'identification elle-même,
// jamais resaisi. Même parcours d'identification que les autres
// signatures (QR/matricule + PIN) — voir src/lib/signature.ts — mais avec
// un documentType dédié ("PHASE_CONTROLE_TECHNIQUE") pour ne pas se
// mélanger avec la signature simple de l'exécutant (POST
// /api/phases/signer, documentType "PHASE"), qui reste le seul mécanisme
// qui fait passer la phase à TERMINEE. Une même personne peut signer
// plusieurs fonctions sur la même phase : chacune crée sa propre ligne,
// jamais un écrasement d'une signature précédente.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreerSignatureDetailleeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { phaseId, fonction, habilitation, entrepriseService, identifiant, pin } = parsed.data;

  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  if (!phase) {
    return NextResponse.json({ error: "Phase introuvable." }, { status: 404 });
  }

  const resultat = await creerSignature({
    identifiant,
    pin,
    documentType: "PHASE_CONTROLE_TECHNIQUE",
    documentId: phaseId,
    versionDocument: new Date().toISOString().slice(0, 10),
  });
  if (!resultat.ok) {
    return NextResponse.json({ error: resultat.erreur }, { status: resultat.statut });
  }

  const signaturePhase = await prisma.signaturePhase.create({
    data: {
      phaseId,
      personnelId: resultat.personnel.id,
      fonction,
      habilitation: habilitation || null,
      entrepriseService: entrepriseService || null,
      signatureId: resultat.signature.id,
    },
  });

  return NextResponse.json({ signaturePhase, personnel: resultat.personnel }, { status: 201 });
}
