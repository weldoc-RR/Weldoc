import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { determinerCriteres, evaluerConformite, type Mesure } from "@/lib/tolerances";
import { requireAuth } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";

const MesureSchema = z.object({
  position: z.string(),
  diametreMm: z.number().optional(),
  epaisseurMm: z.number().optional(),
});

const CreateControleSchema = z.object({
  jointId: z.string().min(1),
  outilId: z.string().optional(),
  normeProduit: z.string().min(1),
  diametreNominalMm: z.number(),
  epaisseurNominaleMm: z.number(),
  mesures: z.array(MesureSchema).min(1),
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
  const { jointId, outilId, normeProduit, diametreNominalMm, epaisseurNominaleMm, mesures } = parsed.data;

  let criteres;
  try {
    criteres = determinerCriteres({ normeProduit, diametreNominalMm, epaisseurNominaleMm });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const resultat = evaluerConformite(mesures as Mesure[], criteres);

  // Vérification de l'outil de mesure (rattachement automatique au PV,
  // comme demandé au cahier des charges) : on signale s'il n'est plus
  // valide, sans bloquer la saisie du contrôle.
  let alerteOutil: string | null = null;
  if (outilId) {
    const outil = await prisma.outil.findUnique({ where: { id: outilId } });
    if (!outil) {
      alerteOutil = "Outil introuvable.";
    } else {
      const statutOutil = calculerStatutOutil(outil.dateEcheance, { horsService: outil.statut === "HORS_SERVICE" });
      if (statutOutil !== "VALIDE") {
        alerteOutil = `Outil "${outil.reference}" ${statutOutil === "HORS_SERVICE" ? "hors service" : "avec vérification expirée"} : mesures à considérer avec prudence.`;
      }
    }
  }

  const controle = await prisma.controleDimensionnel.create({
    data: {
      jointId,
      controleurId,
      outilId,
      mesures: mesures as object,
      criteresAppliques: criteres as unknown as object,
      resultat,
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
  }

  return NextResponse.json({ controle, criteres, fncCreee: fnc, alerteOutil }, { status: 201 });
}
