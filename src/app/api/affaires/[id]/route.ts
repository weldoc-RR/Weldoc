import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { SIGLES_CONTROLE } from "@/lib/controlesManquants";
import { SIGLES_DOCUMENT } from "@/lib/documentsManquants";

const UpdateSchema = z.object({
  nombreJointsPrevus: z.number().int().nonnegative().nullable().optional(),
  // Contrôles exigés sur chaque joint d'origine de l'affaire (voir
  // src/lib/controlesManquants.ts et l'alerte "contrôles manquants" sur
  // /alertes). Omis, ne change pas ; [] pour tout retirer.
  controlesRequis: z.array(z.enum(SIGLES_CONTROLE)).optional(),
  // Documents exigés sur chaque joint d'origine de l'affaire (voir
  // src/lib/documentsManquants.ts et l'alerte "documents manquants" sur
  // /alertes). Même principe additif que controlesRequis.
  documentsRequis: z.array(z.enum(SIGLES_DOCUMENT)).optional(),
});

// PATCH /api/affaires/[id] — informations générales éditables de
// l'affaire (nombre de joints prévus, contrôles requis, documents
// requis). Simples champs éditables, comme les autres informations
// générales : pas une décision réglementaire, pas de contrôle de niveau
// ni d'audit trail dédié.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  const misAJour = await prisma.affaire.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(misAJour);
}
