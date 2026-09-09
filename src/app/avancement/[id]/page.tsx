import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerAvancementAffaire } from "@/lib/avancement";
import { BarreSequence, LegendeStatutsPhase } from "../barre-sequence";
import { PhaseLigne } from "./phase-ligne";

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

      <div style={{ display: "flex", gap: "2rem", marginBottom: "1.5rem", color: "#52514e" }}>
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

      <h2 style={{ marginTop: "2rem" }}>Phases</h2>
      <p style={{ fontSize: "0.85rem", color: "#52514e" }}>
        Fait avancer chaque phase et lui relie, si besoin, la procédure interne applicable (voir{" "}
        <Link href="/procedures">la bibliothèque de procédures</Link>).
      </p>
      {sequencesAvecPhases.every((s) => s.phases.length === 0) ? (
        <p>Aucune phase pour l&apos;instant.</p>
      ) : (
        sequencesAvecPhases.map(
          (s) =>
            s.phases.length > 0 && (
              <div key={s.id} style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.2rem" }}>{s.nom}</h3>
                {s.phases.map((p) => (
                  <PhaseLigne key={p.id} phase={p} procedures={procInternesOptions} />
                ))}
              </div>
            )
        )
      )}
    </main>
  );
}
