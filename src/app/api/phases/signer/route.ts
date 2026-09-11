import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifierSequencementAutorise } from "@/lib/sequencement";
import { pointsBloquants } from "@/lib/dossierReglementaire";
import { signerPlusieursDocuments } from "@/lib/signature";
import { tracerModification } from "@/lib/auditTrail";

const SignerPhasesSchema = z.object({
  phaseIds: z.array(z.string().min(1)).min(1),
  identifiant: z.string().min(1),
  pin: z.string().min(1),
});

// POST /api/phases/signer — l'exécutant coche les phases qu'il vient de
// réaliser puis s'identifie une seule fois (QR/matricule + code PIN, voir
// src/lib/signature.ts) : ça vaut signature pour chacune des phases
// cochées et les passe TERMINEE. Une session ouverte sur l'appareil reste
// nécessaire (requireAuth), mais la personne qui signe peut être
// différente de celle connectée — même principe que POST /api/signatures
// (tablette partagée).
//
// Comme pour la validation du rapport de fin de fabrication, chaque phase
// est d'abord vérifiée (séquencement, points réglementaires bloquants —
// mêmes règles que PATCH /api/phases) AVANT toute signature : soit toutes
// les phases cochées sont signées, soit aucune ne l'est. Le pilote HTTPS
// utilisé pour joindre la base ne permettant pas de vraies transactions,
// cette vérification préalable est ce qui garantit qu'on n'obtient jamais
// un état à moitié signé.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = SignerPhasesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { phaseIds, identifiant, pin } = parsed.data;

  const phases = await prisma.phase.findMany({
    where: { id: { in: phaseIds } },
    include: { sequence: { select: { affaireId: true } } },
  });
  if (phases.length !== phaseIds.length) {
    return NextResponse.json({ error: "Une ou plusieurs phases sont introuvables." }, { status: 404 });
  }

  for (const phase of phases) {
    const { autorise, motif } = await verifierSequencementAutorise(phase.id);
    if (!autorise) {
      return NextResponse.json({ error: `${phase.nom} : ${motif}` }, { status: 422 });
    }
    const bloquants = await pointsBloquants(phase.sequence.affaireId, { phaseId: phase.id });
    if (bloquants.length > 0) {
      return NextResponse.json(
        { error: `${phase.nom} : point(s) réglementaire(s) bloquant(s) : ${bloquants.map((p) => p.intitule).join(", ")}.` },
        { status: 422 }
      );
    }
  }

  const resultat = await signerPlusieursDocuments({
    identifiant,
    pin,
    documentType: "PHASE",
    documentIds: phases.map((p) => p.id),
    versionDocument: new Date().toISOString().slice(0, 10),
  });
  if (!resultat.ok) {
    return NextResponse.json({ error: resultat.erreur }, { status: resultat.statut });
  }

  // Écritures séquentielles (voir plus haut, pas de transaction avec ce
  // pilote) : chaque phase passe TERMINEE et se lie à sa propre signature.
  const phasesSignees = [];
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const signature = resultat.signatures[i];
    const misAJour = await prisma.phase.update({
      where: { id: phase.id },
      data: { statut: "TERMINEE", signatureId: signature.id },
    });
    phasesSignees.push(misAJour);
    await tracerModification({
      utilisateurId: auth.utilisateur.personnelId,
      entite: "Phase",
      entiteId: phase.id,
      ancienneValeur: { statut: phase.statut },
      nouvelleValeur: { statut: "TERMINEE", signatureId: signature.id },
      motif: `Signée par ${resultat.personnel.prenom} ${resultat.personnel.nom} (QR/PIN).`,
    });
  }

  return NextResponse.json({ phases: phasesSignees, personnel: resultat.personnel }, { status: 201 });
}
