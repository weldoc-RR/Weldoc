import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";
import { calculerProchaineConfirmation } from "@/lib/confirmationQualification";
import { Destinataires } from "./destinataires";

export const dynamic = "force-dynamic";

export default async function AlertesPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [outils, qualifications, qualificationsToutes, destinataires] = await Promise.all([
    prisma.outil.findMany({ where: { statut: { not: "HORS_SERVICE" } } }),
    prisma.qualification.findMany({
      where: { statut: { not: "SUSPENDU" }, frequenceConfirmationMois: { not: null } },
      include: { personnel: { select: { nom: true, prenom: true } }, evenements: true },
    }),
    prisma.qualification.findMany({
      where: { statut: { not: "SUSPENDU" } },
      include: { personnel: { select: { nom: true, prenom: true } }, evenements: { orderBy: { date: "desc" }, take: 1 } },
    }),
    prisma.destinataireAlerte.findMany({ orderBy: { email: "asc" } }),
  ]);

  const alertes = outils
    .map((o) => ({ outil: o, statut: calculerStatutOutil(o.dateEcheance) }))
    .filter((a) => a.statut === "EXPIRE" || a.statut === "BIENTOT_ECHEANCE")
    .sort((a, b) => (a.outil.dateEcheance?.getTime() ?? 0) - (b.outil.dateEcheance?.getTime() ?? 0));

  const alertesConfirmation = qualifications
    .map((q) => {
      const datesConfirmations = q.evenements.filter((e) => e.type === "CONFIRMATION_VALIDITE").map((e) => e.date);
      return {
        qualification: q,
        confirmation: calculerProchaineConfirmation(q.frequenceConfirmationMois, q.dateObtention, datesConfirmations),
      };
    })
    .filter((a) => a.confirmation.enRetard || a.confirmation.bientotDue)
    .sort((a, b) => (a.confirmation.prochaineDateDue?.getTime() ?? 0) - (b.confirmation.prochaineDateDue?.getTime() ?? 0));

  const alertesReconduction = qualificationsToutes
    .filter((q) => q.evenements[0]?.type === "RECONDUCTION_PROPOSEE")
    .sort((a, b) => (a.evenements[0]?.date.getTime() ?? 0) - (b.evenements[0]?.date.getTime() ?? 0));

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Alertes</h1>
      <h2>Vérifications d'outillage</h2>
      {alertes.length === 0 ? (
        <p>Aucune alerte pour l'instant.</p>
      ) : (
        <ul>
          {alertes.map(({ outil, statut }) => (
            <li key={outil.id} style={{ color: statut === "EXPIRE" ? "crimson" : "darkorange" }}>
              <strong>{outil.reference}</strong> ({outil.type}) —{" "}
              {statut === "EXPIRE" ? "vérification expirée" : "à renouveler"} le{" "}
              {outil.dateEcheance?.toLocaleDateString("fr-FR")}
            </li>
          ))}
        </ul>
      )}

      <h2>Confirmations de validité de qualification</h2>
      {alertesConfirmation.length === 0 ? (
        <p>Aucune alerte pour l&apos;instant.</p>
      ) : (
        <ul>
          {alertesConfirmation.map(({ qualification: q, confirmation }) => (
            <li key={q.id} style={{ color: confirmation.enRetard ? "crimson" : "darkorange" }}>
              <strong>{q.reference}</strong> ({q.personnel.prenom} {q.personnel.nom}) —{" "}
              {confirmation.enRetard ? "confirmation en retard depuis" : "confirmation à faire avant"} le{" "}
              {confirmation.prochaineDateDue?.toLocaleDateString("fr-FR")}
            </li>
          ))}
        </ul>
      )}

      <h2>Reconductions de qualification proposées</h2>
      {alertesReconduction.length === 0 ? (
        <p>Aucune alerte pour l&apos;instant.</p>
      ) : (
        <ul>
          {alertesReconduction.map((q) => (
            <li key={q.id} style={{ color: "darkorange" }}>
              <strong>{q.reference}</strong> ({q.personnel.prenom} {q.personnel.nom}) — proposée le{" "}
              {q.evenements[0]?.date.toLocaleDateString("fr-FR")}, en attente de validation (
              <Link href="/personnel">voir la fiche personnel</Link>)
            </li>
          ))}
        </ul>
      )}

      <Destinataires initiaux={destinataires} />
    </main>
  );
}
