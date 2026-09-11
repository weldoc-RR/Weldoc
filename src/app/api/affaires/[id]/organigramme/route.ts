import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { construireOrganigramme } from "@/lib/organigramme";

// GET /api/affaires/[id]/organigramme — voir src/lib/organigramme.ts pour
// le détail de la construction (rôles de l'affaire + affectations actives
// du planning, rien n'est stocké séparément).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const organigramme = await construireOrganigramme(params.id);
  if (!organigramme) {
    return NextResponse.json({ error: "Affaire introuvable." }, { status: 404 });
  }

  return NextResponse.json(organigramme);
}
