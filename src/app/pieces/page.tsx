import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { AjouterPiece } from "./ajouter-piece";
import { LIBELLE_STATUT } from "./libelle-statut";
import { ChangerStatut } from "./changer-statut";
import { BadgeControle } from "../joints/badge-controle";

export const dynamic = "force-dynamic";

function dernierResultat(controles: { dateControle: Date; resultat: string }[]): string | null {
  if (controles.length === 0) return null;
  return [...controles].sort((a, b) => b.dateControle.getTime() - a.dateControle.getTime())[0].resultat;
}

function numeroAffiche(j: { numero: string; indiceReparation: number }) {
  return j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero;
}

export default async function PiecesPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [pieces, affaires] = await Promise.all([
    prisma.piece.findMany({
      include: {
        affaire: { select: { numero: true, client: true } },
        joints: {
          select: {
            id: true,
            numero: true,
            indiceReparation: true,
            controlesDim: { select: { dateControle: true, resultat: true } },
            controlesVisuels: { select: { dateControle: true, resultat: true } },
            controlesRessuage: { select: { dateControle: true, resultat: true } },
            controlesMagnetoscopie: { select: { dateControle: true, resultat: true } },
            controlesRadiographie: { select: { dateControle: true, resultat: true } },
            controlesUltrasons: { select: { dateControle: true, resultat: true } },
          },
          orderBy: { numero: "asc" },
        },
      },
      orderBy: { datePriseEnCharge: "desc" },
    }),
    prisma.affaire.findMany({ orderBy: { numero: "asc" }, select: { id: true, numero: true, client: true } }),
  ]);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Pièces (atelier)</h1>
      <p>
        Prise en charge de pièces au fil de l&apos;eau, avec suivi de traçabilité tout au long de la fabrication.
      </p>

      <h2>Prendre en charge une pièce</h2>
      <AjouterPiece affaires={affaires} />

      <h2 style={{ marginTop: "2rem" }}>Pièces enregistrées</h2>
      {pieces.length === 0 ? (
        <p>Aucune pièce enregistrée pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {pieces.map((p) => (
            <li key={p.id} style={{ marginBottom: "1rem", borderBottom: "1px solid var(--couleur-bordure)", paddingBottom: "0.75rem" }}>
              <strong>{p.reference}</strong>
              {p.designation && ` — ${p.designation}`} — {p.affaire.numero} ({p.affaire.client}) —{" "}
              {LIBELLE_STATUT[p.statut]}
              <ChangerStatut pieceId={p.id} statutActuel={p.statut} />
              {p.photosUrls.length > 0 && (
                <div>
                  {p.photosUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" style={{ marginRight: "0.5rem" }}>
                      photo
                    </a>
                  ))}
                </div>
              )}
              {p.joints.length > 0 && (
                <div style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
                  Joints concernés :
                  <ul style={{ margin: "0.2rem 0 0 0", padding: 0, listStyle: "none" }}>
                    {p.joints.map((j) => (
                      <li key={j.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.15rem" }}>
                        <Link href="/joints">{numeroAffiche(j)}</Link>
                        <BadgeControle sigle="DIM" dernierResultat={dernierResultat(j.controlesDim)} />
                        <BadgeControle sigle="VT" dernierResultat={dernierResultat(j.controlesVisuels)} />
                        <BadgeControle sigle="PT" dernierResultat={dernierResultat(j.controlesRessuage)} />
                        <BadgeControle sigle="MT" dernierResultat={dernierResultat(j.controlesMagnetoscopie)} />
                        <BadgeControle sigle="RT" dernierResultat={dernierResultat(j.controlesRadiographie)} />
                        <BadgeControle sigle="UT" dernierResultat={dernierResultat(j.controlesUltrasons)} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
