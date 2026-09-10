import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { annoterStatutProcedures } from "@/lib/procedures";
import { calculerStatut } from "@/lib/statutValidite";
import { verifierQS } from "@/lib/verificationQS";
import { calculerStatutOutil, outilUtilisable } from "@/lib/statutOutil";
import { calculerStatutConsommable, consommableUtilisable } from "@/lib/statutConsommable";
import { AjouterJoint } from "./ajouter-joint";
import { AjouterMatiere } from "./ajouter-matiere";
import { DeclarerMatierePrevue } from "./declarer-matiere-prevue";
import { AjouterScanTqc } from "./ajouter-scan-tqc";
import { DeclarerReparation } from "./declarer-reparation";
import { BadgeControle } from "./badge-controle";
import { ControlesJoint } from "./controles-joint";
import { TableauTuyauterie } from "./tableau-tuyauterie";

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

  const [joints, affaires, soudeurs, matieres, wpsList, consommablesList, outilsList, produitsDimList, scansTqc, matieresPrevues, pieces] = await Promise.all([
    prisma.joint.findMany({
      include: {
        affaire: { select: { numero: true, client: true } },
        soudeur: {
          select: {
            nom: true,
            prenom: true,
            qualifications: {
              where: { type: "SOUDAGE" },
              select: {
                id: true,
                procede: true,
                groupeMateriaux: true,
                epaisseurMinMm: true,
                epaisseurMaxMm: true,
                diametreMinMm: true,
                diametreMaxMm: true,
                dateExpiration: true,
                statut: true,
              },
            },
          },
        },
        matiere: { select: { designation: true, nuance: true, normeProduit: true, diametre: true, epaisseur: true } },
        piece: { select: { reference: true } },
        wps: {
          select: {
            reference: true,
            version: true,
            procede: true,
            groupeMateriaux: true,
            // Le métal d'apport se déclare passe par passe (WpsPasse, un WPS
            // peut en avoir plusieurs) : on retient celui de la première
            // passe comme valeur représentative pour le tableau des joints,
            // suffisant dans l'immense majorité des cas (même métal
            // d'apport sur toutes les passes d'un même WPS).
            passes: {
              take: 1,
              orderBy: { ordre: "asc" },
              select: { metalApportType: true, metalApportDesignationNormalisee: true },
            },
            epaisseurMinMm: true,
            epaisseurMaxMm: true,
            diametreMinMm: true,
            diametreMaxMm: true,
          },
        },
        controlesDim: { select: { dateControle: true, resultat: true } },
        controlesVisuels: { select: { id: true, dateControle: true, resultat: true, procedureRef: true } },
        controlesRessuage: { select: { dateControle: true, resultat: true } },
        controlesMagnetoscopie: { select: { dateControle: true, resultat: true } },
        controlesRadiographie: { select: { dateControle: true, resultat: true } },
        controlesUltrasons: { select: { dateControle: true, resultat: true } },
        fncs: { select: { id: true, reference: true, statut: true } },
        ficheSoudage: {
          include: { joints: { select: { id: true, numero: true, indiceReparation: true } } },
        },
        tqc: true,
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
    prisma.consommableCND.findMany({
      select: { id: true, type: true, fabricant: true, reference: true, lot: true, peremption: true },
      orderBy: { fabricant: "asc" },
    }),
    prisma.outil.findMany({
      where: { statut: { not: "HORS_SERVICE" } },
      select: { id: true, reference: true, type: true, dateEcheance: true, statut: true },
    }),
    prisma.produitDimensionnel.findMany({
      where: { retiree: false },
      select: { id: true, reference: true, version: true, designation: true, normeProduit: true, diametreNominalMm: true, epaisseurNominaleMm: true, createdAt: true, retiree: true },
      orderBy: [{ reference: "asc" }, { createdAt: "desc" }],
    }),
    prisma.scanTqc.findMany({
      include: {
        operateur: { select: { nom: true, prenom: true } },
        joints: { select: { id: true, numero: true, indiceReparation: true } },
      },
      orderBy: { dateScan: "desc" },
    }),
    prisma.matierePrevue.findMany({
      include: { affaire: { select: { numero: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.piece.findMany({ select: { id: true, affaireId: true, reference: true }, orderBy: { reference: "asc" } }),
  ]);
  // Seule la révision la plus récente (non retirée) de chaque référence
  // est proposée au contrôle, même principe que les WPS en vigueur
  // ci-dessus.
  const produitsDimEnVigueur = annoterStatutProcedures(produitsDimList, (p) => p.createdAt).filter(
    (p) => p.statutAffiche === "EN_VIGUEUR"
  );
  // Seules les révisions en vigueur (les plus récentes, non retirées) sont
  // proposées pour un nouveau joint — les anciennes restent visibles mais
  // ne doivent plus être choisies pour du travail neuf.
  const wpsEnVigueur = annoterStatutProcedures(wpsList, (w) => w.dateEmission).filter(
    (w) => w.statutAffiche === "EN_VIGUEUR"
  );
  // Seuls les outils encore utilisables (voir POST /api/controles-dimensionnels,
  // qui refuse un outil expiré ou hors service) sont proposés.
  const outilsUtilisables = outilsList
    .filter((o) => outilUtilisable(calculerStatutOutil(o.dateEcheance, { horsService: o.statut === "HORS_SERVICE" })))
    .map((o) => ({ id: o.id, reference: o.reference, type: o.type }));
  // Même principe que les outils ci-dessus (voir POST /api/controles-*, qui
  // refuse un consommable périmé) : un produit périmé n'est plus proposé au
  // choix, il reste seulement visible/traçable sur /consommables.
  const consommablesUtilisables = consommablesList
    .filter((c) => consommableUtilisable(calculerStatutConsommable(c.peremption)))
    .map((c) => ({ id: c.id, type: c.type, fabricant: c.fabricant, reference: c.reference, lot: c.lot }));

  // Regroupement par affaire puis par numéro de joint (les réparations
  // partagent le même numéro, avec un indiceReparation croissant), pour
  // afficher la chaîne M800 → M800 R1 → M800 R2 plutôt qu'une liste plate.
  const parAffaire = new Map<string, typeof joints>();
  for (const j of joints) {
    const liste = parAffaire.get(j.affaireId) ?? [];
    liste.push(j);
    parAffaire.set(j.affaireId, liste);
  }

  // Scans 3D groupés par affaire, même principe d'affichage que les
  // joints ci-dessus — chaque scan reste un enregistrement indépendant,
  // jamais remplacé par le suivant sur la même zone.
  const scansParAffaire = new Map<string, typeof scansTqc>();
  for (const s of scansTqc) {
    const liste = scansParAffaire.get(s.affaireId) ?? [];
    liste.push(s);
    scansParAffaire.set(s.affaireId, liste);
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Joints</h1>
      <p style={{ color: "var(--couleur-texte-attenue)", marginTop: 0 }}>
        Chaque joint et, quand il y en a eu, sa chaîne de remise en conformité (M800 → M800 R1 → M800 R2...) —
        jamais un enregistrement écrasé par un autre.
      </p>

      <h2>Matières prévues (commande) par affaire</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--couleur-texte-attenue)", maxWidth: 640 }}>
        Déclaré une seule fois par l&apos;encadrement, puis comparé automatiquement à chaque matière réceptionnée
        sur cette affaire (norme, nuance, diamètre, épaisseur) — un écart n&apos;empêche jamais la réception, il
        se signale simplement en alerte.
      </p>
      <DeclarerMatierePrevue affaires={affaires} />
      {matieresPrevues.length > 0 && (
        <ul style={{ fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          {matieresPrevues.map((p) => (
            <li key={p.id}>
              {p.affaire.numero} — {p.designation}, {p.normeProduit} / {p.nuance}
              {p.diametre != null ? ` — Ø${p.diametre} mm` : ""}
              {p.epaisseur != null ? ` — ép. ${p.epaisseur} mm` : ""}
              {p.quantitePrevue ? ` — ${p.quantitePrevue}` : ""}
            </li>
          ))}
        </ul>
      )}

      <h2>Réceptionner une matière</h2>
      <AjouterMatiere affaires={affaires} />

      <h2>Scan 3D (TQC)</h2>
      <p style={{ fontSize: "0.85rem", color: "#52514e", maxWidth: 640 }}>
        Deuxième méthode du TQC (voir le cahier des charges) — complémentaire au TQC texte + book photo de chaque
        joint (bouton &quot;+ TQC&quot; ci-dessous). Une zone peut couvrir plusieurs joints à la fois.
      </p>
      <AjouterScanTqc
        affaires={affaires}
        joints={joints.map((j) => ({ id: j.id, numero: j.numero, indiceReparation: j.indiceReparation, affaireId: j.affaireId }))}
      />

      <h2>Créer un joint</h2>
      <AjouterJoint affaires={affaires} soudeurs={soudeurs} matieres={matieres} wpsEnVigueur={wpsEnVigueur} pieces={pieces} />

      <h2 style={{ marginTop: "2rem" }}>Joints enregistrés</h2>
      {joints.length === 0 ? (
        <p>Aucun joint enregistré pour l&apos;instant.</p>
      ) : (
        Array.from(parAffaire.entries()).map(([affaireId, jointsAffaire]) => (
          <div key={affaireId} style={{ marginBottom: "1.5rem" }}>
            <h3>
              {jointsAffaire[0].affaire.numero} — {jointsAffaire[0].affaire.client}
            </h3>
            <TableauTuyauterie joints={jointsAffaire} />
            {(scansParAffaire.get(affaireId) ?? []).length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, marginBottom: "0.8rem" }}>
                {(scansParAffaire.get(affaireId) ?? []).map((s) => (
                  <li key={s.id} style={{ fontSize: "0.85rem", color: "#52514e", marginBottom: "0.3rem" }}>
                    📡 Scan 3D — {s.zone} — {s.dateScan.toLocaleDateString("fr-FR")} — {s.operateur.prenom}{" "}
                    {s.operateur.nom}
                    {s.logiciel && ` — ${s.logiciel}${s.versionLogiciel ? ` ${s.versionLogiciel}` : ""}`}
                    {s.joints.length > 0 &&
                      ` — joints : ${s.joints.map((j) => (j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero)).join(", ")}`}{" "}
                    —{" "}
                    <a href={s.fichierSourceUrl} target="_blank" rel="noopener noreferrer">
                      fichier source
                    </a>
                    {s.fichierGenereUrl && (
                      <>
                        {" · "}
                        <a href={s.fichierGenereUrl} target="_blank" rel="noopener noreferrer">
                          fichier généré
                        </a>
                      </>
                    )}
                    {s.isoResultantUrl && (
                      <>
                        {" · "}
                        <a href={s.isoResultantUrl} target="_blank" rel="noopener noreferrer">
                          ISO/TQC résultant
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <ul style={{ listStyle: "none", padding: 0 }}>
              {jointsAffaire.map((j) => {
                const fncsOuvertes = j.fncs.filter((f) => f.statut !== "CLOTUREE");
                const numeroAffiche = j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero;
                const estDernierDeLaChaine = !jointsAffaire.some(
                  (autre) => autre.numero === j.numero && autre.indiceReparation === j.indiceReparation + 1
                );

                // Rapprochement QS/WPS, purement indicatif — voir
                // src/lib/verificationQS.ts. Affiché seulement quand il y a
                // un constat net (non couvert, ou aucune qualification
                // soudage) : pas de bruit quand les données manquent juste
                // pour conclure.
                let alerteQS: string | null = null;
                if (j.soudeur && j.wps) {
                  const qualificationsActives = j.soudeur.qualifications.filter(
                    (q) =>
                      calculerStatut(q.dateExpiration, { suspendu: q.statut === "SUSPENDU" }) !== "EXPIRE" &&
                      q.statut !== "SUSPENDU"
                  );
                  const resultatQS = verifierQS(qualificationsActives, j.wps);
                  if (resultatQS.statut === "NON_COUVERT") {
                    alerteQS = `QS : aucune qualification ne couvre ce WPS (${resultatQS.ecarts.join(" ; ")})`;
                  } else if (resultatQS.statut === "AUCUNE_QUALIFICATION") {
                    alerteQS = "QS : ce soudeur n'a aucune qualification soudage enregistrée";
                  }
                }
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
                    {j.piece && ` — pièce ${j.piece.reference}`}
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
                    {alerteQS && (
                      <span style={{ marginLeft: "0.6rem", color: "#fab219" }} title="Vérification indicative, à confirmer par une personne compétente">
                        ⚠ {alerteQS}
                      </span>
                    )}
                    {estDernierDeLaChaine && <DeclarerReparation jointId={j.id} fncsOuvertes={fncsOuvertes} />}
                    <ControlesJoint
                      jointId={j.id}
                      jointNumero={numeroAffiche}
                      controlesVisuels={j.controlesVisuels.map((cv) => ({
                        id: cv.id,
                        procedureRef: cv.procedureRef,
                        dateControle: cv.dateControle.toISOString(),
                      }))}
                      consommables={consommablesUtilisables}
                      outils={outilsUtilisables}
                      produitsDimensionnels={produitsDimEnVigueur}
                      matiere={j.matiere}
                      ficheSoudage={j.ficheSoudage}
                      autresJointsSansFiche={jointsAffaire
                        .filter((autre) => autre.id !== j.id && !autre.ficheSoudageId)
                        .map((autre) => ({ id: autre.id, numero: autre.numero, indiceReparation: autre.indiceReparation }))}
                      tqc={j.tqc}
                    />
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
