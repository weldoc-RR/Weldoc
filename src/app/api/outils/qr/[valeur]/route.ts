import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";

// GET /api/outils/qr/[valeur] — identification d'un outil à partir de la
// valeur lue au scan (caméra tablette ou douchette), avec vérification de
// validité immédiate. Si le QR ne correspond à rien, le terrain peut
// retomber sur une recherche par référence/numéro de série via
// GET /api/outils.
export async function GET(req: NextRequest, { params }: { params: { valeur: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;

  const outil = await prisma.outil.findUnique({ where: { qrCodeValeur: params.valeur } });
  if (!outil) {
    return NextResponse.json({ error: "Aucun outil ne correspond à ce QR code." }, { status: 404 });
  }

  const statutCalcule = calculerStatutOutil(outil.dateEcheance, { horsService: outil.statut === "HORS_SERVICE" });

  return NextResponse.json({
    ...outil,
    statutCalcule,
    valide: statutCalcule === "VALIDE",
  });
}
