import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatutOutil } from "@/lib/statutOutil";
import { calculerStatut } from "@/lib/statutValidite";
import { calculerProchaineConfirmation } from "@/lib/confirmationQualification";
import { pointBloque } from "@/lib/dossierReglementaire";
import { Destinataires } from "./destinataires";

export const dynamic = "force-dynamic";

// Alertes centralisées (voir le cahier des charges, "ALERTES" : "Qualifications
// à échéance, habilitations expirées, documents obsolètes, FNC ouvertes,
// blocages, validations niveau 3 en attente, dossiers réglementaires
// incomplets, contrôles manquants, outils métrologiques expirés, documents
// manquants") : un seul écran plutôt que d'aller chercher chaque signal sur
// sa page d'origine (personnel, système qualité, dossier réglementaire...).
// Chaque catégorie ci-dessous réutilise le calcul déjà en place ailleurs
// (calculerStatut, statutActuel/pointBloque) — rien n'est recalculé
// différemment ici. "Documents obsolètes/manquants" et "contrôles
// manquants" ne sont pas repris : Weldoc n'a pas encore de notion de
// "documents/contrôles attendus" pour une affaire à comparer à l'existant.
export default async function AlertesPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [outils, qualifications, qualificationsToutes, habilitations, fncsOuvertes, pointsReglementaires, destinataires] =
    await Promise.all([
      prisma.outil.findMany({ where: { statut: { not: "HORS_SERVICE" } } }),
      prisma.qualification.findMany({
        where: { statut: { not: "SUSPENDU" }, frequenceConfirmationMois: { not: null } },
        include: { personnel: { select: { nom: true, prenom: true } }, evenements: true },
      }),
      prisma.qualification.findMany({
        where: { statut: { not: "SUSPENDU" } },
        include: { personnel: { select: { nom: true, prenom: true } }, evenements: { orderBy: { date: "desc" }, take: 1 } },
      }),
      prisma.habilitation.findMany({
        where: { statut: { not: "SUSPENDU" } },
        include: { personnel: { select: { nom: true, prenom: true } } },
      }),
      prisma.fNC.findMany({
        where: { statut: { not: "CLOTUREE" } },
        include: { affaire: { select: { numero: true } }, joint: { select: { numero: true, indiceReparation: true } } },
      }),
      prisma.pointReglementaire.findMany({
        include: { affaire: { select: { numero: true } }, evenements: { orderBy: { date: "desc" }, take: 1 } },
      }),
      prisma.destinataireAlerte.findMany({ orderBy: { email: "asc" } }),
    ]);

  const alertesQualification = qualificationsToutes
    .map((q) => ({ qualification: q, statut: calculerStatut(q.dateExpiration) }))
    .filter((a) => a.statut === "EXPIRE" || a.statut === "BIENTOT_ECHEANCE")
    .sort((a, b) => (a.qualification.dateExpiration?.getTime() ?? 0) - (b.qualification.dateExpiration?.getTime() ?? 0));

  const alertesHabilitation = habilitations
    .map((h) => ({ habilitation: h, statut: calculerStatut(h.dateExpiration) }))
    .filter((a) => a.statut === "EXPIRE" || a.statut === "BIENTOT_ECHEANCE")
    .sort((a, b) => (a.habilitation.dateExpiration?.getTime() ?? 0) - (b.habilitation.dateExpiration?.getTime() ?? 0));

  // Le dernier événement de chaque point fait foi (déjà trié par date
  // décroissante côté requête, take:1) — même principe que
  // src/lib/systemeQualite.ts pour ce même calcul.
  const pointsBloquants = pointsReglementaires.filter((p) => p.evenements[0] && pointBloque(p.evenements[0].statut));

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

      <h2>Qualifications à échéance ou expirées</h2>
      {alertesQualification.length === 0 ? (
        <p>Aucune alerte pour l&apos;instant.</p>
      ) : (
        <ul>
          {alertesQualification.map(({ qualification: q, statut }) => (
            <li key={q.id} style={{ color: statut === "EXPIRE" ? "crimson" : "darkorange" }}>
              <strong>{q.reference}</strong> ({q.personnel.prenom} {q.personnel.nom}) —{" "}
              {statut === "EXPIRE" ? "expirée" : "à échéance"} le {q.dateExpiration?.toLocaleDateString("fr-FR")} (
              <Link href="/personnel">voir la fiche personnel</Link>)
            </li>
          ))}
        </ul>
      )}

      <h2>Habilitations à échéance ou expirées</h2>
      {alertesHabilitation.length === 0 ? (
        <p>Aucune alerte pour l&apos;instant.</p>
      ) : (
        <ul>
          {alertesHabilitation.map(({ habilitation: h, statut }) => (
            <li key={h.id} style={{ color: statut === "EXPIRE" ? "crimson" : "darkorange" }}>
              <strong>{h.intitule}</strong> ({h.personnel.prenom} {h.personnel.nom}) —{" "}
              {statut === "EXPIRE" ? "expirée" : "à échéance"} le {h.dateExpiration?.toLocaleDateString("fr-FR")} (
              <Link href="/personnel">voir la fiche personnel</Link>)
            </li>
          ))}
        </ul>
      )}

      <h2>FNC ouvertes</h2>
      {fncsOuvertes.length === 0 ? (
        <p>Aucune alerte pour l&apos;instant.</p>
      ) : (
        <ul>
          {fncsOuvertes.map((f) => (
            <li key={f.id} style={{ color: f.impact === "BLOQUANTE" ? "crimson" : "darkorange" }}>
              <strong>{f.reference}</strong> ({f.impact === "BLOQUANTE" ? "bloquante" : "non bloquante"}) — affaire{" "}
              {f.affaire.numero}
              {f.joint && `, joint ${f.joint.indiceReparation > 0 ? `${f.joint.numero} R${f.joint.indiceReparation}` : f.joint.numero}`}
            </li>
          ))}
        </ul>
      )}

      <h2>Dossier réglementaire — points bloquants</h2>
      {pointsBloquants.length === 0 ? (
        <p>Aucune alerte pour l&apos;instant.</p>
      ) : (
        <ul>
          {pointsBloquants.map((p) => (
            <li key={p.id} style={{ color: "crimson" }}>
              <strong>{p.intitule}</strong> — affaire {p.affaire.numero} (
              <Link href={`/affaires/${p.affaireId}/reglementaire`}>voir le dossier réglementaire</Link>)
            </li>
          ))}
        </ul>
      )}

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
