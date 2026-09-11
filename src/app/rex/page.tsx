import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { OuvrirRedactionRex } from "./ouvrir-redaction-rex";
import { problematiquesSimilaires, type CriteresRex } from "@/lib/rexSimilaire";

export const dynamic = "force-dynamic";

const LIBELLE_IMPACT: Record<string, string> = {
  BLOQUANTE: "Bloquante",
  NON_BLOQUANTE: "Non bloquante",
  REGLEMENTAIREMENT_SENSIBLE: "Réglementairement sensible",
};

// Retour d'expérience (voir le cahier des charges, "RETOUR D'EXPÉRIENCE
// (REX)") : les FNC alimentent une base de REX, classée par type de
// problème/origine/cause/solution/résultat. Le matériau/procédé/
// fournisseur/type de joint/chantier ne sont jamais ressaisis : ils
// viennent du joint et de l'affaire de la FNC. "Identification de
// problématiques similaires" (voir src/lib/rexSimilaire.ts) rapproche
// chaque fiche des autres qui partagent au moins un de ces cinq critères
// — une aide au repérage, jamais un diagnostic : Weldoc ne dit jamais
// "c'est le même problème", seulement quels critères sont communs. Les
// notes REX (/affaires/[id]/notes-rex) permettent en plus à tout
// intervenant de noter une observation à tout moment de l'affaire, sans
// attendre qu'une FNC existe — le lien "Voir les notes de l'affaire"
// ci-dessous y mène pour aider à rédiger une fiche.
export default async function RexPage({ searchParams }: { searchParams: { typeProbleme?: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [fichesRex, fncsSansRex] = await Promise.all([
    prisma.ficheREX.findMany({
      include: {
        redacteur: { select: { nom: true, prenom: true } },
        fnc: {
          select: {
            reference: true,
            description: true,
            impact: true,
            affaire: { select: { id: true, numero: true, chantier: true } },
            joint: {
              select: {
                numero: true,
                indiceReparation: true,
                typeJoint: true,
                wpsReference: true,
                wps: { select: { procede: true } },
                matiere: { select: { nuance: true, fournisseur: true } },
              },
            },
          },
        },
      },
      orderBy: { dateRedaction: "desc" },
    }),
    prisma.fNC.findMany({
      where: { rex: null },
      select: { id: true, reference: true, description: true, impact: true, affaire: { select: { id: true, numero: true } } },
      orderBy: { dateCreation: "desc" },
    }),
  ]);

  const typesProbleme = [...new Set(fichesRex.map((f) => f.typeProbleme))].sort();
  const filtre = searchParams.typeProbleme;
  const fichesFiltrees = filtre ? fichesRex.filter((f) => f.typeProbleme === filtre) : fichesRex;

  const criteresParFiche: CriteresRex[] = fichesRex.map((f) => ({
    ficheId: f.id,
    matiereNuance: f.fnc.joint?.matiere?.nuance ?? null,
    matiereFournisseur: f.fnc.joint?.matiere?.fournisseur ?? null,
    procede: f.fnc.joint?.wps?.procede ?? f.fnc.joint?.wpsReference ?? null,
    typeJoint: f.fnc.joint?.typeJoint ?? null,
    chantier: f.fnc.affaire.chantier,
  }));
  const similitudesParFiche = problematiquesSimilaires(criteresParFiche);
  const fichesParId = new Map(fichesRex.map((f) => [f.id, f]));

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Retour d&apos;expérience (REX)</h1>
      <p style={{ fontSize: "0.9rem", color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        Une fiche REX par FNC documentée : type de problème, origine, cause, solution, résultat. Le matériau, le
        procédé, le fournisseur, le type de joint et le chantier se lisent directement sur le joint et l&apos;affaire
        de la FNC, jamais ressaisis ici.
      </p>

      <h2>FNC sans fiche REX ({fncsSansRex.length})</h2>
      {fncsSansRex.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "var(--couleur-texte-discret)" }}>Toutes les FNC ont une fiche REX.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginBottom: "2rem" }}>
          {fncsSansRex.map((f) => (
            <li key={f.id} style={{ marginBottom: "0.6rem", border: "1px solid var(--couleur-bordure)", padding: "0.6rem" }}>
              <strong>{f.reference}</strong> — {f.affaire.numero} — {LIBELLE_IMPACT[f.impact]}
              <div style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)" }}>{f.description}</div>
              <p style={{ fontSize: "0.8rem", margin: "0.2rem 0" }}>
                <Link href={`/affaires/${f.affaire.id}/notes-rex`}>Voir les notes de l&apos;affaire →</Link>
              </p>
              <OuvrirRedactionRex fncId={f.id} />
            </li>
          ))}
        </ul>
      )}

      <h2>Base REX ({fichesRex.length})</h2>
      {typesProbleme.length > 0 && (
        <p style={{ fontSize: "0.85rem" }}>
          Filtrer par type de problème :{" "}
          <Link href="/rex" style={{ fontWeight: filtre ? "normal" : "bold" }}>
            Tous
          </Link>
          {typesProbleme.map((t) => (
            <span key={t}>
              {" · "}
              <Link href={`/rex?typeProbleme=${encodeURIComponent(t)}`} style={{ fontWeight: filtre === t ? "bold" : "normal" }}>
                {t}
              </Link>
            </span>
          ))}
        </p>
      )}
      {fichesFiltrees.length === 0 ? (
        <p>Aucune fiche REX pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {fichesFiltrees.map((f) => {
            const j = f.fnc.joint;
            return (
              <li key={f.id} style={{ marginBottom: "1rem", border: "1px solid var(--couleur-bordure)", padding: "0.75rem" }}>
                <strong>{f.typeProbleme}</strong>
                {f.origine && ` — origine : ${f.origine}`}
                <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-discret)", margin: "0.2rem 0" }}>
                  FNC {f.fnc.reference} — {f.fnc.affaire.numero}
                  {f.fnc.affaire.chantier && ` (${f.fnc.affaire.chantier})`}
                  {j && (
                    <>
                      {" — joint "}
                      {j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero}
                      {j.typeJoint && ` (${j.typeJoint})`}
                      {(j.wps?.procede || j.wpsReference) && ` — procédé ${j.wps?.procede ?? j.wpsReference}`}
                      {j.matiere && ` — ${j.matiere.nuance}${j.matiere.fournisseur ? ` (${j.matiere.fournisseur})` : ""}`}
                    </>
                  )}
                </div>
                <p style={{ fontSize: "0.9rem", margin: "0.3rem 0" }}>
                  <strong>Cause :</strong> {f.cause}
                </p>
                <p style={{ fontSize: "0.9rem", margin: "0.3rem 0" }}>
                  <strong>Solution :</strong> {f.solution}
                </p>
                {f.resultat && (
                  <p style={{ fontSize: "0.9rem", margin: "0.3rem 0" }}>
                    <strong>Résultat :</strong> {f.resultat}
                  </p>
                )}
                <p style={{ fontSize: "0.8rem", margin: "0.2rem 0" }}>
                  <Link href={`/affaires/${f.fnc.affaire.id}/notes-rex`}>Voir les notes de l&apos;affaire →</Link>
                </p>
                {(() => {
                  const similitudes = similitudesParFiche.get(f.id) ?? [];
                  if (similitudes.length === 0) return null;
                  return (
                    <div style={{ fontSize: "0.8rem", margin: "0.4rem 0", padding: "0.4rem", background: "var(--couleur-fond-discret)" }}>
                      <strong>Cas similaires ({similitudes.length}) :</strong>
                      <ul style={{ margin: "0.2rem 0 0 0", paddingLeft: "1.2rem" }}>
                        {similitudes.slice(0, 5).map((s) => {
                          const autre = fichesParId.get(s.ficheId);
                          if (!autre) return null;
                          return (
                            <li key={s.ficheId}>
                              {autre.typeProbleme} (FNC {autre.fnc.reference}) — même {s.criteresCommuns.join(", même ")}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
                <p style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)", margin: 0 }}>
                  Rédigée par {f.redacteur.prenom} {f.redacteur.nom} le {f.dateRedaction.toLocaleDateString("fr-FR")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
