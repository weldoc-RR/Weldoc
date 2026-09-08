import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNiveau } from "@/lib/auth";

const EvenementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("RECONDUCTION_PROPOSEE"),
    commentaire: z.string().optional(),
    preuveJointIds: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("RECONDUCTION_VALIDEE"),
    nouvelleDateExpiration: z.string().datetime(),
    commentaire: z.string().optional(),
    // Signature de la décision (voir POST /api/signatures), optionnelle
    // tant que le module de signature n'est pas généralisé partout.
    signatureId: z.string().optional(),
  }),
  z.object({
    type: z.literal("SUSPENSION"),
    commentaire: z.string().min(1, "Le motif de suspension est obligatoire."),
    signatureId: z.string().optional(),
  }),
  z.object({
    type: z.literal("CONFIRMATION_VALIDITE"),
    commentaire: z.string().optional(),
    // Justification par l'activité réelle (des joints soudés qui répondent
    // aux critères), en plus ou à la place d'un essai — optionnel, comme
    // RECONDUCTION_PROPOSEE.
    preuveJointIds: z.array(z.string()).optional(),
    signatureId: z.string().optional(),
  }),
]);

// POST /api/qualifications/[id]/evenements — fait avancer l'historique d'une
// qualification. Ne remplace jamais l'événement précédent : chaque étape
// (proposition, validation, suspension) est un nouvel enregistrement, comme
// demandé au cahier des charges. Weldoc peut détecter et proposer une
// reconduction (RECONDUCTION_PROPOSEE), mais ne la valide jamais seul :
// RECONDUCTION_VALIDEE et SUSPENSION sont réservées au niveau 3, et la
// personne qui valide est toujours celle authentifiée, jamais une valeur
// transmise par le client.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = EvenementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const requiertNiveau3 = parsed.data.type === "RECONDUCTION_VALIDEE" || parsed.data.type === "SUSPENSION";
  const requiertNiveau2 = parsed.data.type === "CONFIRMATION_VALIDITE";
  const auth = requiertNiveau3
    ? await requireNiveau(req, "NIVEAU_3")
    : requiertNiveau2
      ? await requireNiveau(req, "NIVEAU_2")
      : await requireAuth(req);
  if ("erreur" in auth) return auth.erreur;
  const { utilisateur } = auth;

  const qualification = await prisma.qualification.findUnique({ where: { id: params.id } });
  if (!qualification) {
    return NextResponse.json({ error: "Qualification introuvable." }, { status: 404 });
  }

  if ("signatureId" in parsed.data && parsed.data.signatureId) {
    const signature = await prisma.signature.findUnique({ where: { id: parsed.data.signatureId } });
    if (!signature) {
      return NextResponse.json({ error: "Signature introuvable." }, { status: 422 });
    }
  }

  // Remarque technique : pas de transaction DB ici (le pilote HTTPS utilisé
  // pour joindre Neon depuis certains environnements ne les supporte pas).
  // On écrit d'abord l'événement (le fait historique), puis on met à jour
  // l'état courant de la qualification.
  if (parsed.data.type === "RECONDUCTION_VALIDEE") {
    const evenement = await prisma.qualificationEvenement.create({
      data: {
        qualificationId: qualification.id,
        type: "RECONDUCTION_VALIDEE",
        commentaire: parsed.data.commentaire,
        signatureId: parsed.data.signatureId,
        valideParId: utilisateur.personnelId,
      },
    });
    const miseAJour = await prisma.qualification.update({
      where: { id: qualification.id },
      data: {
        dateExpiration: new Date(parsed.data.nouvelleDateExpiration),
        statut: "VALIDE",
      },
    });
    return NextResponse.json({ evenement, qualification: miseAJour }, { status: 201 });
  }

  if (parsed.data.type === "SUSPENSION") {
    const evenement = await prisma.qualificationEvenement.create({
      data: {
        qualificationId: qualification.id,
        type: "SUSPENSION",
        commentaire: parsed.data.commentaire,
        signatureId: parsed.data.signatureId,
        valideParId: utilisateur.personnelId,
      },
    });
    const miseAJour = await prisma.qualification.update({
      where: { id: qualification.id },
      data: { statut: "SUSPENDU" },
    });
    return NextResponse.json({ evenement, qualification: miseAJour }, { status: 201 });
  }

  if (parsed.data.type === "CONFIRMATION_VALIDITE") {
    // Ne modifie ni l'échéance ni le statut de la qualification : c'est un
    // simple jalon périodique, distinct d'une reconduction/prolongation.
    // La prochaine échéance de confirmation est recalculée à la lecture à
    // partir de cet événement (voir src/lib/confirmationQualification.ts).
    // La confirmation peut se justifier soit par un essai (rien à
    // renseigner de plus), soit par l'activité réelle : les joints soudés
    // par cette personne, cités comme preuve — mêmes joints doivent lui
    // appartenir.
    if (parsed.data.preuveJointIds && parsed.data.preuveJointIds.length > 0) {
      const joints = await prisma.joint.findMany({ where: { id: { in: parsed.data.preuveJointIds } } });
      const tousValides =
        joints.length === parsed.data.preuveJointIds.length &&
        joints.every((j) => j.soudeurId === qualification.personnelId);
      if (!tousValides) {
        return NextResponse.json(
          { error: "Un ou plusieurs joints indiqués comme preuve sont introuvables ou ne concernent pas cette personne." },
          { status: 422 }
        );
      }
    }

    const evenement = await prisma.qualificationEvenement.create({
      data: {
        qualificationId: qualification.id,
        type: "CONFIRMATION_VALIDITE",
        commentaire: parsed.data.commentaire,
        preuveJointIds: parsed.data.preuveJointIds ?? [],
        signatureId: parsed.data.signatureId,
        valideParId: utilisateur.personnelId,
      },
    });
    return NextResponse.json({ evenement }, { status: 201 });
  }

  // RECONDUCTION_PROPOSEE : une simple proposition, non bloquante, qui
  // n'altère pas encore la qualification elle-même.
  const evenement = await prisma.qualificationEvenement.create({
    data: {
      qualificationId: qualification.id,
      type: "RECONDUCTION_PROPOSEE",
      commentaire: parsed.data.commentaire,
      preuveJointIds: parsed.data.preuveJointIds ?? [],
    },
  });
  return NextResponse.json({ evenement }, { status: 201 });
}
