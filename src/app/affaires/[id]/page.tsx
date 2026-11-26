import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { calculerAvancementAffaire } from "@/lib/avancement";
import { pointsBloquants } from "@/lib/dossierReglementaire";
import { AnneauProgression } from "../../avancement/anneau-progression";

export const dynamic = "force-dynamic";

const LIBELLE_TYPE_REALISATION: Record<string, string> = { CHANTIER: "Chantier", ATELIER: "Atelier" };

type Module = {
  href: string;
  titre: string;
  description: string;
  compte?: number;
  alerte?: string;
};

type Groupe = {
  titre: string;
  accent: string;
  modules: Module[];
};

// Carte d'un module (voir CarteModule ci-dessous) : même forme partout
// (titre, description courte, compteur éventuel) plutôt qu'un mur de
// liens texte — voir le cahier des charges, l'espace d'une affaire doit
// rester lisible et accueillant pour quelqu'un qui découvre le chantier,
// pas seulement pour qui connaît déjà l'application par cœur.
function CarteModule({ module: m, accent }: { module: Module; accent: string }) {
  return (
    <Link
      href={m.href}
      className="carte-lien"
      style={{ borderLeft: `4px solid ${accent}`, display: "flex", flexDirection: "column", gap: "0.3rem", minHeight: 108 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.5rem" }}>
        <strong style={{ fontFamily: "var(--font-titres)", fontSize: "1rem" }}>{m.titre}</strong>
        {m.compte !== undefined && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--couleur-texte-attenue)",
              background: "var(--couleur-fond-discret)",
              borderRadius: 999,
              padding: "0.15rem 0.55rem",
              whiteSpace: "nowrap",
            }}
          >
            {m.compte}
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", flex: 1 }}>{m.description}</p>
      {m.alerte && (
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "var(--couleur-non-conforme)" }}>{m.alerte}</p>
      )}
    </Link>
  );
}

// Espace d'un chantier : point d'entrée unique vers tous ses modules
// (jusqu'ici dispersés dans un chapelet de liens texte sur la page
// d'accueil), regroupés par thème avec un repère visuel (couleur) et une
// courte description — pour qu'on comprenne où cliquer sans déjà
// connaître l'application. Les compteurs viennent des mêmes données que
// chaque page cible, recalculés à la lecture comme partout dans Weldoc.
export default async function EspaceChantierPage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affaire = await prisma.affaire.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          joints: true,
          fncs: true,
          photos: true,
          pointsReglementaires: true,
          pvExternes: true,
          etatsDesLieux: true,
          notesRex: true,
          affectations: true,
        },
      },
    },
  });
  if (!affaire) {
    notFound();
  }

  const [avancement, bloquants] = await Promise.all([
    calculerAvancementAffaire(affaire.id),
    pointsBloquants(affaire.id),
  ]);

  const groupes: Groupe[] = [
    {
      titre: "Suivi d'activité",
      accent: "var(--couleur-primaire)",
      modules: [
        {
          href: `/affaires/${affaire.id}/fiche-activite`,
          titre: "Fiche de suivi d'activité",
          description: "En-tête de l'activité, phases, contrôle technique et signatures — le document de référence du chantier.",
        },
        {
          href: `/avancement/${affaire.id}`,
          titre: "Avancement et phases",
          description: "Le détail séquence par séquence, pour faire avancer et signer chaque phase.",
          compte: avancement.pourcentageGlobal,
        },
      ],
    },
    {
      titre: "Dossier et documents",
      accent: "#7c5cbf",
      modules: [
        {
          href: `/affaires/${affaire.id}/dossier`,
          titre: "Rapport de fin de fabrication",
          description: "Le dossier complet de l'intervention, prêt à imprimer et à valider.",
        },
        {
          href: `/affaires/${affaire.id}/photos`,
          titre: "Book photo",
          description: "Toutes les photos prises sur ce chantier, avec leurs annotations.",
          compte: affaire._count.photos,
        },
        {
          href: `/affaires/${affaire.id}/pv-externes`,
          titre: "PV externes",
          description: "Documents reçus de prestataires externes, à revoir et rattacher.",
          compte: affaire._count.pvExternes,
        },
      ],
    },
    {
      titre: "Équipe et organisation",
      accent: "#2a8f6f",
      modules: [
        {
          href: `/affaires/${affaire.id}/planning`,
          titre: "Planning",
          description: "Qui est affecté sur ce chantier, et sur quelle période.",
          compte: affaire._count.affectations,
        },
        {
          href: `/affaires/${affaire.id}/organigramme`,
          titre: "Organigramme",
          description: "L'équipe du chantier par fonction, avec ses qualifications et habilitations.",
        },
      ],
    },
    {
      titre: "Qualité et réglementaire",
      accent: "#c47a1f",
      modules: [
        {
          href: `/affaires/${affaire.id}/reglementaire`,
          titre: "Dossier réglementaire",
          description: "Les points réglementaires de l'affaire, et ce qui bloque éventuellement la suite.",
          compte: affaire._count.pointsReglementaires,
          alerte: bloquants.length > 0 ? `${bloquants.length} point(s) bloquant(s)` : undefined,
        },
        {
          href: `/affaires/${affaire.id}/etat-des-lieux`,
          titre: "État des lieux",
          description: "Prise en charge et restitution du chantier, avec photos et réserves.",
          compte: affaire._count.etatsDesLieux,
        },
        {
          href: `/affaires/${affaire.id}/notes-rex`,
          titre: "Notes REX",
          description: "Retour d'expérience : bonnes pratiques et points à améliorer pour la prochaine fois.",
          compte: affaire._count.notesRex,
        },
      ],
    },
  ];

  return (
    <main style={{ padding: "2rem", maxWidth: 1080 }}>
      <p>
        <Link href="/">← Affaires</Link>
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "center",
          marginTop: "0.5rem",
          marginBottom: "1.75rem",
          padding: "1.5rem",
          border: "1px solid var(--couleur-bordure)",
          borderRadius: "var(--rayon-carte)",
          background: "var(--couleur-fond-discret)",
        }}
      >
        <AnneauProgression pourcentage={avancement.pourcentageGlobal} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ margin: 0 }}>{affaire.numero}</h1>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "1.05rem", color: "var(--couleur-texte-attenue)" }}>
            {affaire.client} / {affaire.projet}
          </p>
          {affaire.libelleActivite && (
            <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.95rem" }}>{affaire.libelleActivite}</p>
          )}
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "var(--couleur-texte-discret)" }}>
            {LIBELLE_TYPE_REALISATION[affaire.typeRealisation] ?? affaire.typeRealisation}
            {affaire.chantier && ` — ${affaire.chantier}`}
            {affaire.site && ` (${affaire.site})`}
            {affaire.dateDebut && ` · depuis le ${affaire.dateDebut.toLocaleDateString("fr-FR")}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-titres)" }}>{affaire._count.joints}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)" }}>Joint(s)</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                fontFamily: "var(--font-titres)",
                color: affaire._count.fncs > 0 ? "var(--couleur-non-conforme)" : "var(--couleur-texte)",
              }}
            >
              {affaire._count.fncs}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--couleur-texte-attenue)" }}>FNC</div>
          </div>
        </div>
      </div>

      {groupes.map((groupe) => (
        <section key={groupe.titre} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{groupe.titre}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
            {groupe.modules.map((m) => (
              <CarteModule key={m.href} module={m} accent={groupe.accent} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
