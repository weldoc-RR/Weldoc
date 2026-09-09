import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerStatistiquesTempsParWps } from "@/lib/productivite";

export const dynamic = "force-dynamic";

function formatMin(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v)} min`;
}

// Temps et productivité (voir le cahier des charges, "TEMPS ET
// PRODUCTIVITÉ") : distingue temps théorique (barème du WPS), prévu
// (planning) et réel (fiche de suivi de soudage), avec des statistiques
// robustes (médiane, quartiles) sur des configurations comparables — par
// WPS, jamais par soudeur, comme demandé explicitement au cahier des
// charges ("éviter de classer les soudeurs uniquement sur leur vitesse").
export default async function ProductivitePage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [wpsList, fichesAvecTemps, affectationsAvecDuree] = await Promise.all([
    prisma.wps.findMany({
      select: { id: true, reference: true, version: true, tempsTheoriqueMin: true },
      orderBy: [{ reference: "asc" }, { version: "asc" }],
    }),
    prisma.ficheTechniqueSoudage.findMany({
      where: { tempsMin: { not: null }, joints: { some: { wpsId: { not: null } } } },
      select: { tempsMin: true, joints: { select: { wpsId: true } } },
    }),
    prisma.affectation.findMany({
      where: { dureeEstimeeMin: { not: null }, joint: { wpsId: { not: null } } },
      select: { dureeEstimeeMin: true, joint: { select: { wpsId: true } } },
    }),
  ]);

  // Une même fiche peut couvrir plusieurs joints ("saisie groupée", voir
  // FicheTechniqueSoudage dans schema.prisma) : son temps réel compte une
  // seule fois par WPS distinct rencontré parmi ses joints (pas une fois
  // par joint), pour ne pas gonfler artificiellement l'échantillon avec
  // la même mesure répétée — dans l'immense majorité des cas un lot
  // partage un seul WPS, donc une seule entrée.
  const tempsReel = fichesAvecTemps.flatMap((f) => {
    const wpsIds = [...new Set(f.joints.map((j) => j.wpsId).filter((id): id is string => id !== null))];
    return wpsIds.map((wpsId) => ({ wpsId, tempsMin: f.tempsMin! }));
  });
  const tempsPrevu = affectationsAvecDuree
    .filter((a) => a.joint?.wpsId)
    .map((a) => ({ wpsId: a.joint!.wpsId!, dureeEstimeeMin: a.dureeEstimeeMin! }));

  const statistiques = calculerStatistiquesTempsParWps(wpsList, tempsReel, tempsPrevu);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link> · <Link href="/procedures">WPS/DMOS →</Link>
      </p>
      <h1>Weldoc — Temps et productivité</h1>
      <p style={{ fontSize: "0.9rem", color: "#52514e", maxWidth: 700 }}>
        Temps théorique (barème saisi sur le WPS), temps prévu (planifié sur une affectation liée à un joint) et
        temps réel (fiche technique de suivi de soudage, une fois signée). Les statistiques sont calculées par WPS
        — c&apos;est la configuration comparable retenue (procédé, domaine) — et jamais par soudeur : Weldoc
        n&apos;établit aucun classement de vitesse individuelle, conformément au cahier des charges.
      </p>

      {statistiques.length === 0 ? (
        <p>Aucune donnée de temps pour l&apos;instant (théorique sur un WPS, prévu sur une affectation, ou réel sur une fiche de suivi de soudage signée).</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "0.4rem 1rem 0.4rem 0" }}>WPS</th>
                <th style={{ padding: "0.4rem 1rem" }}>Théorique</th>
                <th style={{ padding: "0.4rem 1rem" }}>Prévu (médiane)</th>
                <th style={{ padding: "0.4rem 1rem" }}>Réel (médiane)</th>
                <th style={{ padding: "0.4rem 1rem" }}>Réel (25ᵉ–75ᵉ percentile)</th>
                <th style={{ padding: "0.4rem 0" }}>Joints avec temps réel</th>
              </tr>
            </thead>
            <tbody>
              {statistiques.map((s) => (
                <tr key={s.wpsId} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.4rem 1rem 0.4rem 0", whiteSpace: "nowrap" }}>
                    {s.reference} ({s.version})
                  </td>
                  <td style={{ padding: "0.4rem 1rem" }}>{formatMin(s.tempsTheoriqueMin)}</td>
                  <td style={{ padding: "0.4rem 1rem" }}>{formatMin(s.medianePrevueMin)}</td>
                  <td style={{ padding: "0.4rem 1rem", fontWeight: "bold" }}>{formatMin(s.medianeReelleMin)}</td>
                  <td style={{ padding: "0.4rem 1rem", color: "#52514e" }}>
                    {s.p25ReelMin !== null && s.p75ReelMin !== null
                      ? `${Math.round(s.p25ReelMin)}–${Math.round(s.p75ReelMin)} min`
                      : "—"}
                  </td>
                  <td style={{ padding: "0.4rem 0" }}>{s.nombreJoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
