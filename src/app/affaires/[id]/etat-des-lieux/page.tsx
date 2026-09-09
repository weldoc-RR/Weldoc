import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { OuvrirConstat } from "./ouvrir-constat";
import { ConstatCard, type ConstatVM } from "./constat-card";

export const dynamic = "force-dynamic";

// Prise en charge / restitution du chantier (voir le cahier des charges) :
// un état des lieux en début d'intervention, un autre en fin, avec photos
// et réserves éventuelles. Le plus récent de chaque type fait foi ; les
// constats plus anciens restent consultables en historique (rien n'est
// jamais écrasé).
export default async function EtatDesLieuxPage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [affaire, etatsDesLieux] = await Promise.all([
    prisma.affaire.findUnique({ where: { id: params.id } }),
    prisma.etatDesLieux.findMany({
      where: { affaireId: params.id },
      include: {
        redacteur: { select: { nom: true, prenom: true } },
        reserves: { orderBy: { dateAjout: "asc" } },
        photos: { include: { auteur: { select: { nom: true, prenom: true } } }, orderBy: { dateAjout: "desc" } },
      },
      orderBy: { dateConstat: "desc" },
    }),
  ]);
  if (!affaire) {
    notFound();
  }

  const versVM = (e: (typeof etatsDesLieux)[number]): ConstatVM => ({
    id: e.id,
    zone: e.zone,
    dateConstat: e.dateConstat.toISOString(),
    observations: e.observations,
    degradationsConstatees: e.degradationsConstatees,
    documentsEntree: e.documentsEntree,
    signatureId: e.signatureId,
    redacteur: e.redacteur,
    reserves: e.reserves.map((r) => ({ id: r.id, description: r.description, transmiseAuClient: r.transmiseAuClient, dateAjout: r.dateAjout.toISOString() })),
    photos: e.photos.map((p) => ({ id: p.id, url: p.url, commentaire: p.commentaire, dateAjout: p.dateAjout.toISOString(), auteur: p.auteur })),
  });

  const affaireId = affaire.id;
  const priseEnCharge = etatsDesLieux.filter((e) => e.type === "PRISE_EN_CHARGE");
  const restitution = etatsDesLieux.filter((e) => e.type === "RESTITUTION");
  const derniereePriseEnCharge = priseEnCharge[0];
  const derniereRestitution = restitution[0];

  function Section({ titre, liste, type, label }: { titre: string; liste: typeof etatsDesLieux; type: "PRISE_EN_CHARGE" | "RESTITUTION"; label: string }) {
    const [actuel, ...historique] = liste;
    return (
      <section style={{ marginBottom: "2rem" }}>
        <h2>{titre}</h2>
        {!actuel && <OuvrirConstat affaireId={affaireId} type={type} label={label} />}
        {actuel && (
          <>
            <ConstatCard constat={versVM(actuel)} affaireId={affaireId} />
            <OuvrirConstat affaireId={affaireId} type={type} label={`${label} (nouveau constat)`} />
          </>
        )}
        {historique.length > 0 && (
          <details style={{ marginTop: "0.5rem" }}>
            <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>Historique ({historique.length})</summary>
            {historique.map((e) => (
              <ConstatCard key={e.id} constat={versVM(e)} affaireId={affaireId} />
            ))}
          </details>
        )}
      </section>
    );
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 900 }}>
      <p>
        <Link href="/">← Affaires</Link> · <Link href={`/affaires/${affaire.id}/dossier`}>Rapport de fin de fabrication →</Link>{" "}
        · <Link href={`/affaires/${affaire.id}/photos`}>Book photo →</Link>
      </p>
      <h1>État des lieux — {affaire.numero}</h1>
      <p>
        {affaire.client} / {affaire.projet}
      </p>

      <Section titre="1. Prise en charge (début d'intervention)" liste={priseEnCharge} type="PRISE_EN_CHARGE" label="Ouvrir le constat de prise en charge" />
      <Section titre="2. Restitution (fin d'intervention)" liste={restitution} type="RESTITUTION" label="Ouvrir le constat de restitution" />

      {derniereePriseEnCharge && derniereRestitution && (
        <section style={{ border: "1px solid #ddd", padding: "0.75rem" }}>
          <h2>3. Comparaison avant / après</h2>
          <p style={{ fontSize: "0.85rem", color: "#898781" }}>
            Utile pour justifier qu'une dégradation était déjà présente avant l&apos;intervention.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
            <div>
              <strong>Prise en charge ({derniereePriseEnCharge.dateConstat.toLocaleDateString("fr-FR")})</strong>
              <p>{derniereePriseEnCharge.degradationsConstatees || "Aucune dégradation constatée."}</p>
            </div>
            <div>
              <strong>Restitution ({derniereRestitution.dateConstat.toLocaleDateString("fr-FR")})</strong>
              <p>{derniereRestitution.degradationsConstatees || "Aucune dégradation constatée."}</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
