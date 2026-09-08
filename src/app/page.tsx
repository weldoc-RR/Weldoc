import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUtilisateurConnecteServeur } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const utilisateur = await getUtilisateurConnecteServeur();
  if (!utilisateur) {
    redirect("/login");
  }

  const affaires = await prisma.affaire.findMany({
    include: { joints: true, fncs: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Weldoc — Affaires</h1>
        <div style={{ textAlign: "right" }}>
          <p>
            Connecté : {utilisateur.prenom} {utilisateur.nom} ({utilisateur.niveau})
          </p>
          <LogoutButton />
        </div>
      </div>
      <p>
        Squelette de démonstration : liste des affaires, joints et FNC. <Link href="/personnel">Personnel →</Link>{" "}
        <Link href="/joints">Joints →</Link> <Link href="/procedures">WPS/QMOS →</Link>{" "}
        <Link href="/consommables">Consommables CND →</Link>{" "}
        <Link href="/alertes">Alertes →</Link> <Link href="/pieces">Pièces (atelier) →</Link>{" "}
        <Link href="/avancement">Avancement →</Link> <Link href="/charte">Charte →</Link>
      </p>
      <ul>
        {affaires.map((a) => (
          <li key={a.id}>
            <strong>{a.numero}</strong> — {a.client} / {a.projet} ({a.typeRealisation.toLowerCase()}) —{" "}
            {a.joints.length} joint(s), {a.fncs.length} FNC
          </li>
        ))}
      </ul>
    </main>
  );
}
