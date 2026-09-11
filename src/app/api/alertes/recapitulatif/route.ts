import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecte, aNiveauMinimum } from "@/lib/auth";
import { construireRecapitulatif, contenuEmailRecapitulatif } from "@/lib/alertesEmail";
import { envoyerEmail } from "@/lib/envoiEmail";

// Autorisé pour : une personne de niveau 3 connectée (déclenchement manuel),
// ou un appel automatisé (tâche planifiée) portant le secret CRON_SECRET en
// en-tête Authorization. Sans CRON_SECRET configuré, seul le déclenchement
// manuel niveau 3 fonctionne.
async function autorise(req: NextRequest): Promise<boolean> {
  const utilisateur = await getUtilisateurConnecte(req);
  if (utilisateur && aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) return true;

  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) return false;
  const enTete = req.headers.get("authorization");
  return enTete === `Bearer ${secretAttendu}`;
}

// GET (tâche planifiée, ex. Vercel Cron) et POST (déclenchement manuel) font
// la même chose : construire le récapitulatif hebdomadaire des alertes
// outillage et l'envoyer à chaque destinataire actif. Voir vercel.json pour
// la programmation "chaque lundi" — n'a d'effet qu'une fois déployé sur
// Vercel, et tant que RESEND_API_KEY/ALERTES_EMAIL_FROM ne sont pas
// configurées, l'email n'est pas envoyé (voir src/lib/envoiEmail.ts).
async function traiterRecapitulatif(req: NextRequest) {
  if (!(await autorise(req))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const recap = await construireRecapitulatif();
  const contenu = contenuEmailRecapitulatif(recap);

  const destinatairesActifs = await prisma.destinataireAlerte.findMany({ where: { actif: true } });

  const resultat = await envoyerEmail({
    destinataires: destinatairesActifs.map((d) => d.email),
    sujet: contenu.sujet,
    texte: contenu.texte,
    html: contenu.html,
  });

  return NextResponse.json({ recap, ...resultat });
}

export async function GET(req: NextRequest) {
  return traiterRecapitulatif(req);
}

export async function POST(req: NextRequest) {
  return traiterRecapitulatif(req);
}
