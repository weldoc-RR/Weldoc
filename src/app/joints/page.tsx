import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";
import { AjouterJoint } from "./ajouter-joint";
import { DeclarerReparation } from "./declarer-reparation";
import { BadgeControle } from "./badge-controle";

export const dynamic = "force-dynamic";

function dernierResultat(controles: { dateControle: Date; resultat: string }[]): string | null {
  if (controles.length === 0) return null;
  return [...controles].sort((a, b) => b.dateControle.getTime() - a.dateControle.getTime())[0].resultat;
}

export default async function JointsPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [joints, affaires, soudeurs, matieres, wpsList] = await Promise.all([
    prisma.joint.findMany({
      include: {
        affaire: { select: { numero: true, client: true } },
        soudeur: { select: { nom: true, prenom: true } },
        matiere: { select: { designation: true, nuance: true } },
        wps: { select: { reference: true, version: true } },
        controlesDim: { select: { dateControle: true, resultat: true } },
        controlesVisuels: { select: { dateControle: true, resultat: true } },
        controlesRessuage: { select: { dateControle: true, resultat: true } },
        controlesMagnetoscopie: { select: { dateControle: true, resultat: true } },
        controlesRadiographie: { select: { dateControle: true, resultat: true } },
        controlesUltrasons: { select: { dateControle: true, resultat: true } },
        fncs: { select: { id: true, reference: true, statut: true } },
      },
      orderBy: [{ affaireId: "asc" }, { numero: "asc" }, { indiceReparation: "asc" }],
    }),
    prisma.affaire.findMany({ orderBy: { numero: "asc" }, select: { id: true, numero: true, client: true } }),
    prisma.personnel.findMany({
      where: { fonctions: { some: { fonction: { contains: "soudeur", mode: "insensitive" } } } },
      select: { id: true, nom: true, prenom: true },
      orderBy: { nom: "asc" },
    }),
    prisma.matiere.findMany({ select: { id: true, affaireId: true, designation: true, nuance: true } }),
    prisma.wps.findMany({ select: { id: true, reference: true, version: true, dateEmission: true, retiree: true } }),
  ]);
  // Seules les révisions en vigueur (les plus récentes, non retirées) sont
  // proposées pour un nouveau joint — les anciennes restent visibles mais
  // ne doivent plus être choisies pour du travail neuf.
  const wpsEnVigueur = annoterStatutProcedures(wpsList, (w) => w.dateEmission).filter(
    (w) => w.statutAffiche === "EN_VIGUEUR"
  );

  // Regroupement par affaire puis par numéro de joint (les réparations
  // partagent le même numéro, avec un indiceReparation croissant), pour
  // afficher la chaîne M800 → M800 R1 → M800 R2 plutôt qu'une liste plate.
  const parAffaire = new Map<string, typeof joints>();
  for (const j of joints) {
    const liste = parAffaire.get(j.affaireId) ?? [];
    liste.push(j);
    parAffaire.set(j.affaireId, liste);
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Joints</h1>
      <p>
        Chaque joint et, quand il y en a eu, sa chaîne de remise en conformité (M800 → M800 R1 → M800 R2...) —
        jamais un enregistrement écrasé par un autre.
      </p>

      <h2>Créer un joint</h2>
      <AjouterJoint affaires={affaires} soudeurs={soudeurs} matieres={matieres} wpsEnVigueur={wpsEnVigueur} />

      <h2 style={{ marginTop: "2rem" }}>Joints enregistrés</h2>
      {joints.length === 0 ? (
        <p>Aucun joint enregistré pour l&apos;instant.</p>
      ) : (
        Array.from(parAffaire.entries()).map(([affaireId, jointsAffaire]) => (
          <div key={affaireId} style={{ marginBottom: "1.5rem" }}>
            <h3>
              {jointsAffaire[0].affaire.numero} — {jointsAffaire[0].affaire.client}
            </h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {jointsAffaire.map((j) => {
                const fncsOuvertes = j.fncs.filter((f) => f.statut !== "CLOTUREE");
                const numeroAffiche = j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero;
                const estDernierDeLaChaine = !jointsAffaire.some(
                  (autre) => autre.numero === j.numero && autre.indiceReparation === j.indiceReparation + 1
                );
                return (
                  <li
                    key={j.id}
                    style={{
                      marginBottom: "0.6rem",
                      paddingLeft: `${j.indiceReparation * 1.5}rem`,
                      borderBottom: j.indiceReparation === 0 ? "1px solid #ddd" : "none",
                      paddingBottom: "0.4rem",
                    }}
                  >
                    {j.indiceReparation > 0 && "↳ "}
                    <strong>{numeroAffiche}</strong>
                    {j.typeAction && ` (${j.typeAction.toLowerCase()})`}
                    {j.soudeur && ` — ${j.soudeur.prenom} ${j.soudeur.nom}`}
                    {j.matiere && ` — ${j.matiere.designation} (${j.matiere.nuance})`}
                    {j.wps && ` — WPS ${j.wps.reference} (${j.wps.version})`}
                    <span style={{ marginLeft: "0.6rem", display: "inline-flex", gap: "0.25rem" }}>
                      <BadgeControle sigle="DIM" dernierResultat={dernierResultat(j.controlesDim)} />
                      <BadgeControle sigle="VT" dernierResultat={dernierResultat(j.controlesVisuels)} />
                      <BadgeControle sigle="PT" dernierResultat={dernierResultat(j.controlesRessuage)} />
                      <BadgeControle sigle="MT" dernierResultat={dernierResultat(j.controlesMagnetoscopie)} />
                      <BadgeControle sigle="RT" dernierResultat={dernierResultat(j.controlesRadiographie)} />
                      <BadgeControle sigle="UT" dernierResultat={dernierResultat(j.controlesUltrasons)} />
                    </span>
                    {fncsOuvertes.length > 0 && (
                      <span style={{ marginLeft: "0.6rem", color: "#d03b3b" }}>
                        {fncsOuvertes.length} FNC ouverte(s) : {fncsOuvertes.map((f) => f.reference).join(", ")}
                      </span>
                    )}
                    {estDernierDeLaChaine && <DeclarerReparation jointId={j.id} fncsOuvertes={fncsOuvertes} />}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </main>
  );
}
