import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { AjouterPhoto } from "./ajouter-photo";
import { AnnoterPhoto } from "./annoter-photo";
import type { IsoTrait } from "@/app/joints/iso-canvas";

export const dynamic = "force-dynamic";

function traitsDepuis(annotations: unknown): IsoTrait[] {
  return Array.isArray(annotations) ? (annotations as IsoTrait[]) : [];
}

// Book photo (voir le cahier des charges) : toutes les photos d'une
// affaire, horodatées, rattachées optionnellement à une phase/un joint/une
// FNC — utilisées pour la prise en charge, le suivi, les contrôles, les
// FNC, le TQC et la restitution. "Annotables" (voir le cahier des
// charges) : chaque photo peut être annotée au stylet (voir
// annoter-photo.tsx), même mécanisme que l'ISO manuel du TQC.
export default async function PhotosAffairePage({ params }: { params: { id: string } }) {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const [affaire, photos, phases, joints, fncs] = await Promise.all([
    prisma.affaire.findUnique({ where: { id: params.id } }),
    prisma.photo.findMany({
      where: { affaireId: params.id },
      include: {
        auteur: { select: { nom: true, prenom: true } },
        joint: { select: { numero: true } },
        phase: { select: { nom: true } },
        fnc: { select: { reference: true } },
      },
      orderBy: { dateAjout: "desc" },
    }),
    prisma.phase.findMany({ where: { sequence: { affaireId: params.id } }, select: { id: true, nom: true } }),
    prisma.joint.findMany({ where: { affaireId: params.id }, select: { id: true, numero: true, indiceReparation: true } }),
    prisma.fNC.findMany({ where: { affaireId: params.id }, select: { id: true, reference: true } }),
  ]);
  if (!affaire) {
    notFound();
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 900 }}>
      <p>
        <Link href={`/affaires/${affaire.id}/dossier`}>Rapport de fin de fabrication →</Link>
      </p>
      <h1 style={{ marginBottom: "0.25rem" }}>Book photo — {affaire.numero}</h1>
      <p style={{ color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        {affaire.client} / {affaire.projet}
      </p>

      <AjouterPhoto
        affaireId={affaire.id}
        phases={phases}
        joints={joints.map((j) => ({ id: j.id, numeroAffiche: j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero }))}
        fncs={fncs}
      />

      {photos.length === 0 ? (
        <p>Aucune photo enregistrée pour l&apos;instant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {photos.map((p) => (
            <li key={p.id} style={{ border: "1px solid var(--couleur-bordure)", padding: "0.5rem" }}>
              <img src={p.url} alt={p.commentaire ?? "Photo"} style={{ width: "100%", display: "block", marginBottom: "0.3rem" }} />
              {p.commentaire && <p style={{ fontSize: "0.85rem", margin: "0.2rem 0" }}>{p.commentaire}</p>}
              <p style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)", margin: 0 }}>
                {p.dateAjout.toLocaleDateString("fr-FR")} — {p.auteur.prenom} {p.auteur.nom}
                {p.joint && ` — ${p.joint.numero}`}
                {p.phase && ` — ${p.phase.nom}`}
                {p.fnc && ` — ${p.fnc.reference}`}
              </p>
              <AnnoterPhoto photoId={p.id} url={p.url} annotations={traitsDepuis(p.annotations)} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
