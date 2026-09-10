import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { AjouterNote } from "./ajouter-note";

export const dynamic = "force-dynamic";

// Notes REX (voir le cahier des charges, "RETOUR D'EXPÉRIENCE (REX)") :
// contrairement à la fiche REX (une par FNC, rédigée après coup à la
// clôture — voir /rex), une note se prend à tout moment de l'affaire, par
// n'importe quel intervenant, sans attendre qu'une FNC existe. Alimente le
// REX progressivement plutôt que tout d'un coup à la fin ; jamais
// modifiée ni supprimée une fois postée, seulement consultée au moment de
// rédiger une fiche REX.
export default async function NotesRexPage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [affaire, notes] = await Promise.all([
    prisma.affaire.findUnique({ where: { id: params.id } }),
    prisma.noteRex.findMany({
      where: { affaireId: params.id },
      include: { auteur: { select: { nom: true, prenom: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!affaire) {
    notFound();
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 700 }}>
      <p>
        <Link href="/">← Affaires</Link> · <Link href="/rex">REX →</Link>
      </p>
      <h1>Notes REX — {affaire.numero}</h1>
      <p>
        {affaire.client} / {affaire.projet}
      </p>
      <p style={{ fontSize: "0.85rem", color: "#898781" }}>
        Une observation notée à tout moment de l&apos;affaire, par n&apos;importe quel intervenant — pas besoin
        d&apos;attendre qu&apos;une FNC existe. Ces notes aident ensuite à rédiger une fiche REX ; elles ne sont
        jamais modifiées ni supprimées une fois postées.
      </p>

      <AjouterNote affaireId={affaire.id} />

      {notes.length === 0 ? (
        <p>Aucune note pour l&apos;instant sur cette affaire.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {notes.map((n) => (
            <li key={n.id} style={{ marginBottom: "0.75rem", border: "1px solid #ddd", padding: "0.6rem" }}>
              <p style={{ margin: "0 0 0.3rem 0", whiteSpace: "pre-wrap" }}>{n.texte}</p>
              <p style={{ fontSize: "0.75rem", color: "#898781", margin: 0 }}>
                {n.createdAt.toLocaleDateString("fr-FR")} à{" "}
                {n.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} —{" "}
                {n.auteur.prenom} {n.auteur.nom}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
