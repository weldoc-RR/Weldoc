import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { calculerAvancementAffaire } from "@/lib/avancement";
import { BarreSequence, LegendeStatutsPhase } from "../barre-sequence";
import { PhasesSection } from "./phases-section";
import { DefinirJointsPrevus } from "./definir-joints-prevus";
import { DemandesSequencement } from "./demandes-sequencement";

export const dynamic = "force-dynamic";

export default async function AvancementAffairePage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affaire = await prisma.affaire.findUnique({ where: { id: params.id } });
  if (!affaire) {
    notFound();
  }
  const avancement = await calculerAvancementAffaire(params.id);
  const [sequencesAvecPhases, procedures] = await Promise.all([
    prisma.sequence.findMany({
      where: { affaireId: params.id },
      include: { phases: { orderBy: { ordre: "asc" } } },
      orderBy: { ordre: "asc" },
    }),
    prisma.procedureInterne.findMany({ where: { retiree: false }, orderBy: [{ reference: "asc" }, { dateEmission: "desc" }] }),
  ]);
  const procInternesOptions = procedures.map((p) => ({ id: p.id, reference: p.reference, version: p.version, titre: p.titre }));

  // Signature de chaque phase déjà signée (voir POST /api/phases/signer) :
  // Phase.signatureId reste une référence libre (comme ailleurs dans le
  // modèle), donc on résout ici les Signature correspondantes plutôt que
  // par une relation Prisma.
  const signatureIds = sequencesAvecPhases.flatMap((s) => s.phases.map((p) => p.signatureId).filter((id): id is string => id != null));
  const signaturesPhases =
    signatureIds.length > 0
      ? await prisma.signature.findMany({
          where: { id: { in: signatureIds } },
          include: { personnel: { select: { nom: true, prenom: true } } },
        })
      : [];
  const signatureParPhaseId: Record<string, { nom: string; prenom: string; dateSignature: string }> = {};
  for (const s of sequencesAvecPhases.flatMap((seq) => seq.phases)) {
    const signature = s.signatureId ? signaturesPhases.find((sig) => sig.id === s.signatureId) : undefined;
    if (signature) {
      signatureParPhaseId[s.id] = {
        nom: signature.personnel.nom,
        prenom: signature.personnel.prenom,
        dateSignature: signature.dateSignature.toISOString(),
      };
    }
  }

  const toutesPhases = sequencesAvecPhases.flatMap((s) => s.phases.map((p) => ({ id: p.id, nom: p.nom, sequenceNom: s.nom })));

  // demandeParId/decisionParId restent des références libres (comme
  // signatureId ailleurs dans le modèle), donc on résout ici les
  // personnes correspondantes plutôt que par une relation Prisma.
  const demandesSequencementBrutes = await prisma.demandeModificationSequencement.findMany({
    where: { affaireId: params.id },
    orderBy: { dateDemande: "desc" },
  });
  const idsPersonnesDemandes = [
    ...new Set(demandesSequencementBrutes.flatMap((d) => [d.demandeParId, d.decisionParId].filter((id): id is string => id != null))),
  ];
  const personnesDemandes =
    idsPersonnesDemandes.length > 0
      ? await prisma.personnel.findMany({ where: { id: { in: idsPersonnesDemandes } }, select: { id: true, nom: true, prenom: true } })
      : [];
  const personneParId = new Map(personnesDemandes.map((p) => [p.id, p]));
  const demandesSequencement = demandesSequencementBrutes.map((d) => ({
    id: d.id,
    phasesConcerneesIds: d.phasesConcerneesIds,
    motif: d.motif,
    urgent: d.urgent,
    photoUrl: d.photoUrl,
    documentUrl: d.documentUrl,
    dateDemande: d.dateDemande.toISOString(),
    statut: d.statut,
    commentaireDecision: d.commentaireDecision,
    conditions: d.conditions,
    dateDecision: d.dateDecision ? d.dateDecision.toISOString() : null,
    demandeur: personneParId.get(d.demandeParId) ?? null,
    decideur: d.decisionParId ? (personneParId.get(d.decisionParId) ?? null) : null,
  }));

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/avancement">← Avancement</Link>
      </p>
      <h1>
        Avancement — {affaire.numero} ({affaire.client})
      </h1>

      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", margin: "1rem 0" }}>
        <span style={{ fontSize: "2.5rem", fontWeight: "bold" }}>{avancement.pourcentageGlobal}%</span>
        <span style={{ color: "#52514e" }}>des phases applicables du dossier de fabrication sont terminées</span>
      </div>

      <div style={{ display: "flex", gap: "2rem", marginBottom: "0.5rem", color: "#52514e", flexWrap: "wrap" }}>
        <div>
          <strong style={{ color: "#0b0b0b" }}>{avancement.joints.total}</strong> joint(s)
          {avancement.joints.reparations > 0 && <> ({avancement.joints.reparations} réparation(s))</>}
        </div>
        <div>
          <strong style={{ color: "#0b0b0b" }}>{avancement.joints.controlesDimensionnelsConformes}</strong> joint(s)
          avec contrôle dimensionnel conforme
        </div>
        <div>
          <strong style={{ color: avancement.fnc.ouvertes > 0 ? "#d03b3b" : "#0b0b0b" }}>
            {avancement.fnc.ouvertes}
          </strong>{" "}
          FNC ouverte(s) sur {avancement.fnc.total}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {avancement.joints.prevus !== null ? (
          <>
            <div style={{ width: 240, height: 10, background: "#e1e0d9", borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, avancement.joints.pourcentageJoints ?? 0)}%`,
                  height: "100%",
                  background: "#0086c9",
                }}
              />
            </div>
            <span style={{ color: "#52514e" }}>
              <strong style={{ color: "#0b0b0b" }}>{avancement.joints.soudes}</strong> joint(s) soudé(s) sur{" "}
              <strong style={{ color: "#0b0b0b" }}>{avancement.joints.prevus}</strong> prévu(s) (
              {avancement.joints.pourcentageJoints}%)
            </span>
          </>
        ) : (
          <span style={{ color: "#898781" }}>Nombre de joints prévus non saisi</span>
        )}
        <DefinirJointsPrevus affaireId={affaire.id} valeurActuelle={affaire.nombreJointsPrevus} />
      </div>

      <h2>Par séquence</h2>
      <LegendeStatutsPhase />
      {avancement.sequences.length === 0 ? (
        <p>Aucune séquence pour cette affaire.</p>
      ) : (
        <table style={{ marginTop: "1rem", borderCollapse: "collapse" }}>
          <tbody>
            {avancement.sequences.map((s) => (
              <tr key={s.sequenceId}>
                <td style={{ padding: "0.4rem 1rem 0.4rem 0", whiteSpace: "nowrap" }}>{s.nom}</td>
                <td style={{ padding: "0.4rem 1rem" }}>
                  <BarreSequence avancement={s} />
                </td>
                <td style={{ padding: "0.4rem 0", whiteSpace: "nowrap", color: "#52514e" }}>
                  {s.pourcentage}% ({s.terminees}/{s.totalPhases - s.nonApplicables})
                  {s.enCours > 0 && <>, {s.enCours} en cours</>}
                  {s.nonApplicables > 0 && <>, {s.nonApplicables} non applicable(s)</>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <DemandesSequencement
        affaireId={affaire.id}
        phases={toutesPhases}
        demandes={demandesSequencement}
        peutDecider={aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")}
      />

      <h2 style={{ marginTop: "2rem" }}>Phases</h2>
      <p style={{ fontSize: "0.85rem", color: "#52514e" }}>
        Fait avancer chaque phase et lui relie, si besoin, la procédure interne applicable (voir{" "}
        <Link href="/procedures">la bibliothèque de procédures</Link>). Pour clore une phase réalisée, la cocher
        puis signer (QR/PIN) plutôt que de changer son statut manuellement.
      </p>
      <PhasesSection sequencesAvecPhases={sequencesAvecPhases} procedures={procInternesOptions} signatures={signatureParPhaseId} />
    </main>
  );
}
