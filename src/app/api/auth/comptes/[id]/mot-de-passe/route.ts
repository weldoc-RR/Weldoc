import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, aNiveauMinimum, hashMotDePasse, verifierMotDePasse, revoquerToutesLesSessions } from "@/lib/auth";
import { tracerModification } from "@/lib/auditTrail";

const ChangerMotDePasseSchema = z.object({
  motDePasseActuel: z.string().optional(),
  nouveauMotDePasse: z.string().min(8, "8 caractères minimum."),
});

// POST /api/auth/comptes/[id]/mot-de-passe — change le mot de passe d'un
// compte (identifié ici par son id de Compte, comme PATCH /api/auth/
// comptes/[id] ci-dessus). Deux cas, même principe que pour le code PIN
// (voir POST /api/personnel/[id]/pin) :
// - la personne elle-même : doit confirmer son mot de passe actuel ;
// - une personne de niveau 3 (en cas d'oubli) : pas de mot de passe actuel
//   à fournir, seulement les droits requis.
// Dans les deux cas, toutes les sessions ouvertes sur ce compte sont
// révoquées : un ancien mot de passe compromis ne doit plus donner accès
// à une session déjà ouverte ailleurs. Tracé par l'audit trail (jamais le
// mot de passe lui-même, seulement l'événement).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;
  const { utilisateur } = auth;

  const compte = await prisma.compte.findUnique({ where: { id: params.id } });
  if (!compte) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const estSoiMeme = utilisateur.compteId === compte.id;
  if (!estSoiMeme && !aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")) {
    return NextResponse.json(
      { error: "Seule la personne concernée, ou une personne de niveau 3, peut changer ce mot de passe." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = ChangerMotDePasseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { motDePasseActuel, nouveauMotDePasse } = parsed.data;

  if (estSoiMeme) {
    if (!motDePasseActuel) {
      return NextResponse.json({ error: "Mot de passe actuel requis." }, { status: 400 });
    }
    const motDePasseValide = await verifierMotDePasse(motDePasseActuel, compte.motDePasseHash);
    if (!motDePasseValide) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
    }
  }

  await prisma.compte.update({
    where: { id: compte.id },
    data: { motDePasseHash: await hashMotDePasse(nouveauMotDePasse) },
  });
  await revoquerToutesLesSessions(compte.id);

  await tracerModification({
    utilisateurId: utilisateur.personnelId,
    entite: "Compte",
    entiteId: compte.id,
    motif: estSoiMeme ? "Changement de mot de passe (par la personne elle-même)." : "Réinitialisation de mot de passe (niveau 3).",
  });

  return NextResponse.json({ ok: true });
}
