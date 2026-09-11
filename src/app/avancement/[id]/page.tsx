import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur, aNiveauMinimum } from "@/lib/auth";
import { calculerAvancementAffaire } from "@/lib/avancement";
import { BarreSequence, LegendeStatutsPhase } from "../barre-sequence";
import { AnneauProgression } from "../anneau-progression";
import { PhasesSection } from "./phases-section";
import { DefinirJointsPrevus } from "./definir-joints-prevus";
import { DemandesSequencement } from "./demandes-sequencement";

export const dynamic = "force-dynamic";

// Petite carte visuelle réutilisée sur tout le tableau de bord (chiffre
// clé + libellé, coins arrondis, légère ombre) : la même forme partout
// donne au tableau de bord un rythme régulier plutôt qu'une mosaïque de
// styles différents.
function CarteStat({ valeur, libelle, couleur }: { valeur: React.ReactNode; libelle: string; couleur?: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--couleur-bordure)",
        borderRadius: "var(--rayon-carte)",
        boxShadow: "var(--ombre-legere)",
        padding: "1rem 1.25rem",
        minWidth: 160,
        flex: "1 1 160px",
      }}
    >
      <div style={{ fontSize: "1.8rem", fontWeight: "bold", fontFamily: "var(--font-titres)", color: couleur ?? "var(--couleur-texte)" }}>
        {valeur}
      </div>
      <div style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", marginTop: "0.2rem" }}>{libelle}</div>
    </div>
  );
}

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
    <main style={{ padding: "2rem", maxWidth: 980 }}>
      <p>
        <Link href="/avancement">← Avancement</Link>
      </p>
      <h1>
        Avancement — {affaire.numero} ({affaire.client})
      </h1>

      {/* ————— Tableau de bord ————— */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "center",
          flexWrap: "wrap",
          margin: "1.25rem 0",
          padding: "1.25rem",
          border: "1px solid var(--couleur-bordure)",
          borderRadius: "var(--rayon-carte)",
          background: "var(--couleur-fond-discret)",
        }}
      >
        <AnneauProgression pourcentage={avancement.pourcentageGlobal} />
        <div>
          <p style={{ margin: 0, fontSize: "1.05rem" }}>
            des phases applicables du dossier de fabrication sont terminées
          </p>
          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem", color: "var(--couleur-texte-attenue)" }}>
            Recalculé à chaque affichage à partir des phases du séquencement — rien n&apos;est jamais figé.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <CarteStat
          valeur={
            <>
              {avancement.joints.total}
              {avancement.joints.reparations > 0 && (
                <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--couleur-texte-attenue)" }}>
                  {" "}
                  (+{avancement.joints.reparations} rép.)
                </span>
              )}
            </>
          }
          libelle="Joints enregistrés"
        />
        <CarteStat
          valeur={avancement.joints.controlesDimensionnelsConformes}
          libelle="Contrôle dimensionnel conforme"
          couleur="var(--couleur-conforme)"
        />
        <CarteStat
          valeur={`${avancement.fnc.ouvertes} / ${avancement.fnc.total}`}
          libelle="FNC ouvertes / total"
          couleur={avancement.fnc.ouvertes > 0 ? "var(--couleur-non-conforme)" : "var(--couleur-conforme)"}
        />
        <div
          style={{
            border: "1px solid var(--couleur-bordure)",
            borderRadius: "var(--rayon-carte)",
            boxShadow: "var(--ombre-legere)",
            padding: "1rem 1.25rem",
            minWidth: 220,
            flex: "1 1 220px",
          }}
        >
          {avancement.joints.prevus !== null ? (
            <>
              <div style={{ fontSize: "1.8rem", fontWeight: "bold", fontFamily: "var(--font-titres)" }}>
                {avancement.joints.soudes}
                <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--couleur-texte-attenue)" }}>
                  {" "}
                  / {avancement.joints.prevus}
                </span>
              </div>
              <div style={{ height: 8, background: "var(--couleur-fond-discret)", borderRadius: 999, overflow: "hidden", margin: "0.4rem 0" }}>
                <div
                  style={{
                    width: `${Math.min(100, avancement.joints.pourcentageJoints ?? 0)}%`,
                    height: "100%",
                    background: "var(--couleur-primaire)",
                    borderRadius: 999,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)" }}>
                Joints soudés sur prévus ({avancement.joints.pourcentageJoints}%)
              </div>
            </>
          ) : (
            <div style={{ fontSize: "0.9rem", color: "var(--couleur-texte-discret)" }}>Nombre de joints prévus non saisi</div>
          )}
          <div style={{ marginTop: "0.5rem" }}>
            <DefinirJointsPrevus affaireId={affaire.id} valeurActuelle={affaire.nombreJointsPrevus} />
          </div>
        </div>
      </div>

      <h2>Par séquence</h2>
      <LegendeStatutsPhase />
      {avancement.sequences.length === 0 ? (
        <p>Aucune séquence pour cette affaire.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
          {avancement.sequences.map((s) => (
            <div
              key={s.sequenceId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                border: "1px solid var(--couleur-bordure)",
                borderRadius: "var(--rayon-carte)",
                padding: "0.7rem 1rem",
              }}
            >
              <div style={{ minWidth: 170, fontWeight: 600 }}>{s.nom}</div>
              <BarreSequence avancement={s} />
              <div style={{ whiteSpace: "nowrap", color: "var(--couleur-texte-attenue)", fontSize: "0.9rem" }}>
                {s.pourcentage}% ({s.terminees}/{s.totalPhases - s.nonApplicables})
                {s.enCours > 0 && <>, {s.enCours} en cours</>}
                {s.nonApplicables > 0 && <>, {s.nonApplicables} non applicable(s)</>}
              </div>
            </div>
          ))}
        </div>
      )}

      <DemandesSequencement
        affaireId={affaire.id}
        phases={toutesPhases}
        demandes={demandesSequencement}
        peutDecider={aNiveauMinimum(utilisateur.niveau, "NIVEAU_3")}
      />

      <h2 style={{ marginTop: "2rem" }}>Phases</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)" }}>
        Fait avancer chaque phase et lui relie, si besoin, la procédure interne applicable (voir{" "}
        <Link href="/procedures">la bibliothèque de procédures</Link>). Pour clore une phase réalisée, la cocher
        puis signer (QR/PIN) plutôt que de changer son statut manuellement.
      </p>
      <PhasesSection sequencesAvecPhases={sequencesAvecPhases} procedures={procInternesOptions} signatures={signatureParPhaseId} />
    </main>
  );
}
