import { NextRequest, NextResponse } from "next/server";
import { getUtilisateurConnecte } from "@/lib/auth";

// GET /api/auth/me — renvoie l'utilisateur authentifié (utile pour l'UI :
// afficher qui est connecté, adapter les actions visibles selon le niveau).
export async function GET(req: NextRequest) {
  const utilisateur = await getUtilisateurConnecte(req);
  if (!utilisateur) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  return NextResponse.json({ utilisateur });
}
