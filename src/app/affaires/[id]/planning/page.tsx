import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";
import { AjouterAffectation } from "./ajouter-affectation";
import { AffectationLigne } from "./affectation-ligne";

export const dynamic = "force-dynamic";

// Planning d'une affaire : qui est affecté, à quelle fonction/activité/
// pièce, avec quels codes d'habilitation site, et si c'est actuellement
// (statut EN_COURS = présence effective sur le chantier). Alimente
// automatiquement l'organigramme et l'annexe habilitations du rapport de
// fin de fabrication (voir GET /api/affaires/[id]/organigramme) — rien
// n'est ressaisi côté rapport.
export default async function PlanningPage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [affaire, affectations, personnel, joints] = await Promise.all([
    prisma.affaire.findUnique({ where: { id: params.id } }),
    prisma.affectation.findMany({
      where: { affaireId: params.id },
      include: {
        personnel: { include: { habilitations: true } },
        joint: { select: { numero: true, indiceReparation: true } },
      },
      orderBy: [{ fonction: "asc" }, { dateDebut: "desc" }],
    }),
    prisma.personnel.findMany({ select: { id: true, nom: true, prenom: true }, orderBy: { nom: "asc" } }),
    prisma.joint.findMany({ where: { affaireId: params.id }, select: { id: true, numero: true, indiceReparation: true } }),
  ]);
  if (!affaire) {
    notFound();
  }

  const parFonction = new Map<string, typeof affectations>();
  for (const a of affectations) {
    const liste = parFonction.get(a.fonction) ?? [];
    liste.push(a);
    parFonction.set(a.fonction, liste);
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 900 }}>
      <p>
        <Link href="/">← Affaires</Link> · <Link href={`/affaires/${affaire.id}/dossier`}>Rapport de fin de fabrication →</Link>
      </p>
      <h1>Planning — {affaire.numero}</h1>
      <p>
        {affaire.client} / {affaire.projet}
      </p>
      <p style={{ fontSize: "0.85rem", color: "#898781" }}>
        Compétence, qualification, habilitation et disponibilité sont vérifiées à l&apos;affectation, mais ne
        bloquent jamais la création : les alertes s&apos;affichent, la décision de passer outre reste humaine.
      </p>

      <AjouterAffectation
        affaireId={affaire.id}
        personnel={personnel}
        joints={joints.map((j) => ({ id: j.id, numeroAffiche: j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero }))}
      />

      {parFonction.size === 0 ? (
        <p>Aucune affectation enregistrée pour l&apos;instant.</p>
      ) : (
        [...parFonction.entries()].map(([fonction, liste]) => (
          <div key={fonction} style={{ marginTop: "1rem" }}>
            <h3>{fonction}</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {liste.map((a) => {
                const habilitationsExpirees = a.personnel.habilitations.filter(
                  (h) => calculerStatut(h.dateExpiration, { suspendu: h.statut === "SUSPENDU" }) === "EXPIRE"
                ).length;
                return (
                  <AffectationLigne
                    key={a.id}
                    affectation={{
                      id: a.id,
                      personnelNom: `${a.personnel.prenom} ${a.personnel.nom}`,
                      jointNumero: a.joint ? `${a.joint.numero}${a.joint.indiceReparation > 0 ? ` R${a.joint.indiceReparation}` : ""}` : null,
                      dateDebut: a.dateDebut.toISOString(),
                      dateFin: a.dateFin.toISOString(),
                      codes: a.codes,
                      statut: a.statut,
                      habilitationsExpirees,
                    }}
                  />
                );
              })}
            </ul>
          </div>
        ))
      )}
    </main>
  );
}
