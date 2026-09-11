import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, aNiveauMinimum } from "@/lib/auth";
import { hashPin } from "@/lib/signature";

// 6 chiffres minimum (voir cahier des charges : le PIN fait office de
// signature électronique, il doit être plus difficile à deviner/épier
// qu'un simple code à 4 chiffres) — relevé depuis le minimum initial de 4.
const DefinirPinSchema = z.object({
  pin: z.string().min(6, "Le code PIN doit faire au moins 6 chiffres.").max(12).regex(/^\d+$/, "Chiffres uniquement."),
});

// POST /api/personnel/[id]/pin — définit ou change le code PIN utilisé pour
// signer (identification QR + PIN, voir POST /api/signatures). Réservé à
// la personne elle-même, ou à une personne de niveau 3 (ex. pour une
// première mise en place, ou en cas d'oubli). Le PIN précédent, s'il
// existe, est simplement remplacé : ce n'est pas un historique à tracer
// comme une qualification, juste un identifiant d'accès.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;
  const { utilisateur } = auth;

  const estSoiMeme = utilisateur.personnelId === params.id;
  if (!estSoiMeme && !aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) {
    return NextResponse.json(
      { error: "Seule la personne concernée, ou une personne de niveau 3, peut définir ce PIN." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = DefinirPinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const personnel = await prisma.personnel.findUnique({ where: { id: params.id } });
  if (!personnel) {
    return NextResponse.json({ error: "Personnel introuvable." }, { status: 404 });
  }

  await prisma.personnel.update({
    where: { id: params.id },
    data: { pinHash: await hashPin(parsed.data.pin) },
  });

  return NextResponse.json({ ok: true });
}
