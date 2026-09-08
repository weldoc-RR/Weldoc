import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { AjouterPiece, LIBELLE_STATUT } from "./ajouter-piece";
import { ChangerStatut } from "./changer-statut";

export const dynamic = "force-dynamic";

export default async function PiecesPage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [pieces, affaires] = await Promise.all([
    prisma.piece.findMany({
      include: { affaire: { select: { numero: true, client: true } } },
      orderBy: { datePriseEnCharge: "desc" },
    }),
    prisma.affaire.findMany({ orderBy: { numero: "asc" }, select: { id: true, numero: true, client: true } }),
  ]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>
      <h1>Weldoc — Pièces (atelier)</h1>
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
            <li key={p.id} style={{ marginBottom: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.75rem" }}>
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
