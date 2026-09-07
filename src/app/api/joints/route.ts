import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateJointSchema = z.object({
  affaireId: z.string().min(1),
  ligne: z.string().optional(),
  spool: z.string().optional(),
  typeJoint: z.string().optional(),
  dn: z.string().optional(),
  diametre: z.number().optional(),
  epaisseur: z.number().optional(),
  matiereId: z.string().optional(),
  wpsReference: z.string().optional(),
  qmosReference: z.string().optional(),
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

// GET /api/joints?affaireId=... — liste les joints d'une affaire
export async function GET(req: NextRequest) {
  const affaireId = req.nextUrl.searchParams.get("affaireId");
  const joints = await prisma.joint.findMany({
    where: affaireId ? { affaireId } : undefined,
    include: { soudeur: true, matiere: true, controlesDim: true, fncs: true },
    orderBy: { numero: "asc" },
  });
  return NextResponse.json(joints);
}

// POST /api/joints — crée un nouveau joint avec numérotation automatique (M800, M801...)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateJointSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const numero = await prochainNumeroJoint(parsed.data.affaireId);

  const joint = await prisma.joint.create({
    data: { ...parsed.data, numero, indiceReparation: 0 },
  });

  return NextResponse.json(joint, { status: 201 });
}
