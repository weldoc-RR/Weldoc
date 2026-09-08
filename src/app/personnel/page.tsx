import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatut } from "@/lib/statutValidite";
import { calculerProchaineConfirmation } from "@/lib/confirmationQualification";
import { AjouterQualification } from "./ajouter-qualification";
import { ConfirmerValidite } from "./confirmer-validite";

export const dynamic = "force-dynamic";

const LIBELLE_STATUT: Record<string, string> = {
  VALIDE: "valide",
  BIENTOT_ECHEANCE: "bientôt à échéance",
  EXPIRE: "expiré",
  EN_RENOUVELLEMENT: "en renouvellement",
  SUSPENDU: "suspendu",
};

export default async function PersonnelPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [personnel, referentiels] = await Promise.all([
    prisma.personnel.findMany({
      orderBy: { nom: "asc" },
      include: {
        fonctions: true,
        qualifications: {
          include: { evenements: { orderBy: { date: "desc" } }, referentiel: { select: { code: true } } },
        },
      },
    }),
    prisma.referentiel.findMany({ select: { id: true, code: true, domaine: true }, orderBy: { code: "asc" } }),
  ]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Personnel</h1>

      {personnel.length > 0 && (
        <AjouterQualification
          personnel={personnel.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom }))}
          referentiels={referentiels}
        />
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {personnel.map((p) => (
          <li key={p.id} style={{ marginBottom: "1.5rem", borderBottom: "1px solid #ddd", paddingBottom: "1rem" }}>
            <strong>
              {p.prenom} {p.nom}
            </strong>{" "}
            — {p.matricule} — {p.societe} — {p.niveau}
            {p.fonctions.length > 0 && <div>Fonctions : {p.fonctions.map((f) => f.fonction).join(", ")}</div>}
            {p.qualifications.length > 0 && (
              <ul>
                {p.qualifications.map((q) => {
                  const statutCalcule =
                    q.evenements[0]?.type === "RECONDUCTION_PROPOSEE"
                      ? "EN_RENOUVELLEMENT"
                      : calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" });
                  const datesConfirmations = q.evenements
                    .filter((e) => e.type === "CONFIRMATION_VALIDITE")
                    .map((e) => e.date);
                  const confirmation = calculerProchaineConfirmation(
                    q.frequenceConfirmationMois,
                    q.dateObtention,
                    datesConfirmations
                  );
                  return (
                    <li key={q.id}>
                      {q.type} {q.reference} ({q.norme}
                      {q.referentiel && ` — ${q.referentiel.code}`}) — {LIBELLE_STATUT[statutCalcule]}
                      {q.dateExpiration && ` (échéance ${q.dateExpiration.toLocaleDateString("fr-FR")})`}
                      {q.codeQualification && ` — ${q.codeQualification}`}
                      {q.groupeMateriaux && ` — groupe matériau ${q.groupeMateriaux}`}
                      {(q.epaisseurMinMm || q.epaisseurMaxMm) && (
                        <> — épaisseur {q.epaisseurMinMm ?? "?"} à {q.epaisseurMaxMm ?? "?"} mm</>
                      )}
                      {(q.diametreMinMm || q.diametreMaxMm) && (
                        <> — diamètre {q.diametreMinMm ?? "?"} à {q.diametreMaxMm ?? "?"} mm</>
                      )}
                      {q.organismeExamen && ` — examinée par ${q.organismeExamen}`}
                      {confirmation.prochaineDateDue && q.statut !== "SUSPENDU" && (
                        <>
                          {" — "}
                          <span style={{ color: confirmation.enRetard ? "crimson" : confirmation.bientotDue ? "darkorange" : "inherit" }}>
                            confirmation {confirmation.enRetard ? "en retard depuis" : "due avant"} le{" "}
                            {confirmation.prochaineDateDue.toLocaleDateString("fr-FR")}
                          </span>
                          <ConfirmerValidite qualificationId={q.id} personnelId={p.id} />
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
