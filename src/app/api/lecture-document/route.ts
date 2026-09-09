import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { lireDocument } from "@/lib/lectureDocument";

const LectureSchema = z.object({
  documentUrl: z.string().min(1),
  type: z.enum(["QUALIFICATION", "HABILITATION"]),
});

// POST /api/lecture-document — lit automatiquement un document déjà
// déposé (voir POST /api/upload) et propose des champs à vérifier avant
// enregistrement (voir src/lib/lectureDocument.ts : l'IA assiste, elle ne
// décide jamais seule — même principe que la reconnaissance de
// caractères sur étiquette de consommable prévue au cahier des charges).
// N'écrit jamais rien en base : la personne relit et corrige la
// proposition dans le formulaire habituel, qui l'enregistre normalement.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "La lecture automatique n'est pas encore configurée (ANTHROPIC_API_KEY manquant)." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const parsed = LectureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const champs = await lireDocument(parsed.data.documentUrl, parsed.data.type);
    return NextResponse.json(champs);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Lecture automatique impossible.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
