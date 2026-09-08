import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, creerSession, verifierMotDePasse } from "@/lib/auth";

const LoginSchema = z.object({
  matricule: z.string().min(1),
  motDePasse: z.string().min(1),
});

// POST /api/auth/login — connexion par matricule + mot de passe.
// Le matricule est celui déjà présent sur la fiche Personnel (jamais ressaisi).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { matricule, motDePasse } = parsed.data;

  const personnel = await prisma.personnel.findUnique({
    where: { matricule },
    include: { compte: true },
  });

  // Message volontairement générique (ne pas indiquer si c'est le matricule
  // ou le mot de passe qui est erroné, ou si le compte est suspendu).
  const echec = () => NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });

  if (!personnel || !personnel.compte) return echec();
  if (personnel.compte.statut !== "ACTIF") return echec();

  const motDePasseValide = await verifierMotDePasse(motDePasse, personnel.compte.motDePasseHash);
  if (!motDePasseValide) return echec();

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
