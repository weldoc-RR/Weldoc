import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { determinerCriteres, evaluerConformite, type Mesure } from "@/lib/tolerances";
import { requireAuth } from "@/lib/auth";
import { verifierOutilPourControle } from "@/lib/statutOutil";
import { avancerFNCApresControleConforme } from "@/lib/remiseEnConformite";

const MesureSchema = z.object({
  position: z.string(),
  diametreMm: z.number().optional(),
  epaisseurMm: z.number().optional(),
});

const CreateControleSchema = z.object({
  jointId: z.string().min(1),
  outilId: z.string().optional(),
  // Produit de la bibliothèque dimensionnelle, quand il y en a un pour ce
  // contrôle (voir /produits-dimensionnels) : ses critères min/maxi déjà
  // déterminés font foi, au lieu du moteur de tolérances placeholder
  // (src/lib/tolerances.ts). normeProduit/diamètre/épaisseur nominaux
  // restent transmis dans tous les cas (affichage, FNC éventuelle).
  produitDimensionnelId: z.string().optional(),
  normeProduit: z.string().min(1),
  diametreNominalMm: z.number(),
  epaisseurNominaleMm: z.number(),
  mesures: z.array(MesureSchema).min(1),
  signatureId: z.string().optional(),
});

// POST /api/controles-dimensionnels
// 1) détermine les critères applicables (traçables vers une norme/version)
// 2) évalue la conformité des mesures saisies par le contrôleur
// 3) si hors tolérance, ouvre automatiquement une FNC liée au joint et au contrôle
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateControleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Le contrôleur est la personne authentifiée qui saisit le contrôle, jamais
  // une valeur transmise par le client : on ne peut pas signer le travail de
  // quelqu'un d'autre.
  const controleurId = auth.utilisateur.personnelId;
  const { jointId, outilId, produitDimensionnelId, normeProduit, diametreNominalMm, epaisseurNominaleMm, mesures, signatureId } =
    parsed.data;

  // Vérification de l'outil de mesure (rattachement automatique au PV,
  // comme demandé au cahier des charges) : un outil expiré ou hors service
  // bloque le contrôle, une mesure prise avec un outil non vérifié n'étant
  // pas exploitable.
  const verifOutil = await verifierOutilPourControle(outilId);
  if (!verifOutil.ok) {
    return NextResponse.json({ error: verifOutil.erreur }, { status: 422 });
  }

  let criteres;
  if (produitDimensionnelId) {
    const produit = await prisma.produitDimensionnel.findUnique({ where: { id: produitDimensionnelId } });
    if (!produit) {
      return NextResponse.json({ error: "Produit de la bibliothèque dimensionnelle introuvable." }, { status: 422 });
    }
    criteres = {
      norme: `${produit.normeProduit} — ${produit.reference} (${produit.version})`,
      diametreNominalMm,
      diametreMiniMm: produit.diametreMiniMm,
      diametreMaxiMm: produit.diametreMaxiMm,
      epaisseurMiniMm: produit.epaisseurMiniMm,
      epaisseurMaxiMm: produit.epaisseurMaxiMm,
    };
  } else {
    try {
      criteres = determinerCriteres({ normeProduit, diametreNominalMm, epaisseurNominaleMm });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 422 });
    }
  }

  const resultat = evaluerConformite(mesures as Mesure[], criteres);

  const controle = await prisma.controleDimensionnel.create({
    data: {
      jointId,
      controleurId,
      outilId,
      produitDimensionnelId,
      mesures: mesures as object,
      criteresAppliques: criteres as unknown as object,
      resultat,
      signatureId,
    },
  });

  let fnc = null;
  if (resultat === "HORS_TOLERANCE") {
    const joint = await prisma.joint.findUniqueOrThrow({ where: { id: jointId } });
    const reference = `FNC-${joint.numero}-${Date.now()}`;

    fnc = await prisma.fNC.create({
      data: {
        reference,
        affaireId: joint.affaireId,
        jointId,
        controleOrigineId: controle.id,
        description: `Contrôle dimensionnel hors tolérance sur ${joint.numero} (critères: ${criteres.norme}).`,
        impact: "BLOQUANTE",
        statut: "DETECTION",
      },
    });
  } else if (resultat === "CONFORME") {
    // Si ce contrôle porte sur un joint de réparation et répond à une FNC en
    // action corrective, la FNC avance à CONTROLE (jamais plus loin sans
    // décision niveau 3 — voir src/lib/remiseEnConformite.ts).
    await avancerFNCApresControleConforme(jointId);
  }

  return NextResponse.json({ controle, criteres, fncCreee: fnc }, { status: 201 });
}
