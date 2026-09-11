import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, creerSession } from "@/lib/auth";
import { verifierPin } from "@/lib/signature";

const LoginQrSchema = z.object({
  // Matricule (saisie manuelle) ou qrCodeValeur (scan/douchette) — même
  // souplesse que l'identification avant signature (voir POST
  // /api/signatures).
  identifiant: z.string().min(1),
  pin: z.string().min(1),
});

// POST /api/auth/login-qr — connexion rapide par identification QR/matricule
// + code PIN, alternative à POST /api/auth/login (matricule + mot de passe)
// pour l'identification sur chantier (voir le cahier des charges,
// "IDENTIFICATION ET SIGNATURE"). Réutilise le PIN déjà en place pour
// signer (Personnel.pinHash, POST /api/personnel/[id]/pin) : pas de
// nouveau secret à créer ou à retenir. Ouvre la même session que la
// connexion par mot de passe — les deux méthodes mènent au même compte.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginQrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { identifiant, pin } = parsed.data;

  const echec = () => NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });

  const personnel = await prisma.personnel.findFirst({
    where: { OR: [{ matricule: identifiant }, { qrCodeValeur: identifiant }] },
    include: { compte: true },
  });
  if (!personnel || !personnel.compte) return echec();
  if (personnel.compte.statut !== "ACTIF") return echec();
  if (!personnel.pinHash) return echec();

  const pinValide = await verifierPin(pin, personnel.pinHash);
  if (!pinValide) return echec();

  const { jeton, expireLe } = await creerSession(personnel.compte.id);
  await prisma.compte.update({
    where: { id: personnel.compte.id },
    data: { derniereConnexion: new Date() },
  });

  const response = NextResponse.json({
    personnel: {
      id: personnel.id,
      matricule: personnel.matricule,
      nom: personnel.nom,
      prenom: personnel.prenom,
      niveau: personnel.niveau,
    },
  });

  response.cookies.set(SESSION_COOKIE_NAME, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expireLe,
  });

  return response;
}
