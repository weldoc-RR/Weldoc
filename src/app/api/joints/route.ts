import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { detecterPreuvesReconduction } from "@/lib/qualifications";
import { calculerStatut } from "@/lib/statutValidite";
import { verifierQS, type ResultatVerificationQS } from "@/lib/verificationQS";
import {
  verifierQualificationBloquante,
  verifierHabilitationsBloquantes,
  qualificationObligatoireSurAffaire,
  assurerAffectation,
} from "@/lib/aptitudePersonnel";

const CreateJointSchema = z.object({
  affaireId: z.string().min(1),
  ligne: z.string().optional(),
  spool: z.string().optional(),
  typeJoint: z.string().optional(),
  dn: z.string().optional(),
  diametre: z.number().optional(),
  epaisseur: z.number().optional(),
  matiereId: z.string().optional(),
  // Pièce d'atelier que ce joint concerne (voir Piece dans schema.prisma),
  // optionnel — n'a de sens que pour une affaire de type ATELIER.
  pieceId: z.string().optional(),
  // wpsReference/qmosReference restent utilisables en texte libre quand la
  // procédure n'est pas (encore) dans la bibliothèque ; wpsId/qmosId
  // pointent vers une fiche réutilisable (voir /api/wps, /api/qmos).
  wpsReference: z.string().optional(),
  wpsId: z.string().optional(),
  qmosReference: z.string().optional(),
  qmosId: z.string().optional(),
  qsReference: z.string().optional(),
  soudeurId: z.string().optional(),
  consommableLot: z.string().optional(),
});

// Numérotation automatique : M800, M801, M802... par affaire.
async function prochainNumeroJoint(affaireId: string): Promise<string> {
  const dernier = await prisma.joint.findFirst({
    where: { affaireId, indiceReparation: 0 },
    orderBy: { numero: "desc" },
  });

  if (!dernier) return "M800";

  const dernierNum = parseInt(dernier.numero.replace("M", ""), 10);
  return `M${dernierNum + 1}`;
}

// GET /api/joints?affaireId=...&soudeurId=... — liste les joints d'une
// affaire et/ou d'un soudeur (ex. pour choisir des joints comme preuve
// d'une confirmation/reconduction de qualification)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const soudeurId = req.nextUrl.searchParams.get("soudeurId");
  const joints = await prisma.joint.findMany({
    where: { affaireId: affaireId ?? undefined, soudeurId: soudeurId ?? undefined },
    include: { soudeur: true, matiere: true, controlesDim: true, fncs: true },
    orderBy: { numero: "asc" },
  });
  return NextResponse.json(joints);
}

// POST /api/joints — crée un nouveau joint avec numérotation automatique (M800, M801...)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = CreateJointSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const wps = parsed.data.wpsId ? await prisma.wps.findUnique({ where: { id: parsed.data.wpsId } }) : null;
  if (parsed.data.wpsId && !wps) {
    return NextResponse.json({ error: "WPS introuvable." }, { status: 422 });
  }
  if (parsed.data.qmosId && !(await prisma.qmos.findUnique({ where: { id: parsed.data.qmosId } }))) {
    return NextResponse.json({ error: "QMOS introuvable." }, { status: 422 });
  }
  if (parsed.data.pieceId) {
    const piece = await prisma.piece.findUnique({ where: { id: parsed.data.pieceId } });
    if (!piece || piece.affaireId !== parsed.data.affaireId) {
      return NextResponse.json({ error: "Pièce introuvable pour cette affaire." }, { status: 422 });
    }
  }

  // Qualification soudage et habilitations, bloquantes (voir
  // src/lib/aptitudePersonnel.ts) : contrairement au rapprochement QS/WPS
  // ci-dessous (indicatif), une personne dont plus aucune qualification
  // soudage n'est valide, ou dont une habilitation enregistrée est
  // expirée/suspendue, ne peut pas être désignée soudeur d'un nouveau
  // joint.
  if (parsed.data.soudeurId) {
    const qualificationObligatoire = await qualificationObligatoireSurAffaire(parsed.data.affaireId);
    const blocageQualif = await verifierQualificationBloquante(parsed.data.soudeurId, "SOUDAGE", {
      qualificationObligatoire,
    });
    if (blocageQualif.bloque) {
      return NextResponse.json({ error: blocageQualif.motif }, { status: 403 });
    }
    const blocageHabilitations = await verifierHabilitationsBloquantes(parsed.data.soudeurId);
    if (blocageHabilitations.bloque) {
      return NextResponse.json({ error: blocageHabilitations.motif }, { status: 403 });
    }
  }

  const numero = await prochainNumeroJoint(parsed.data.affaireId);

  const joint = await prisma.joint.create({
    data: { ...parsed.data, numero, indiceReparation: 0 },
  });

  if (joint.soudeurId) {
    await detecterPreuvesReconduction(joint.soudeurId, joint.id);

    // Contexte de l'affaire (voir src/lib/aptitudePersonnel.ts) : intègre
    // automatiquement le soudeur au planning de cette affaire s'il n'y
    // est pas déjà, plutôt que d'exiger une affectation planifiée à
    // l'avance.
    await assurerAffectation(joint.soudeurId, joint.affaireId, "Soudeur", auth.utilisateur.personnelId);
  }

  // Rapprochement QS/WPS, non bloquant (voir src/lib/verificationQS.ts) :
  // signale sans jamais empêcher la création du joint.
  let verificationQS: ResultatVerificationQS | null = null;
  if (joint.soudeurId && wps) {
    const qualifications = await prisma.qualification.findMany({
      where: { personnelId: joint.soudeurId, type: "SOUDAGE" },
    });
    const qualificationsActives = qualifications.filter(
      (q) => calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }) !== "EXPIRE" && q.statut !== "SUSPENDU"
    );
    verificationQS = verifierQS(qualificationsActives, wps);
  }

  return NextResponse.json({ ...joint, verificationQS }, { status: 201 });
}
