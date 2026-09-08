import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const affaires = await prisma.affaire.findMany({
    include: { joints: true, fncs: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Weldoc — Affaires</h1>
      <p>Squelette de démonstration : liste des affaires, joints et FNC.</p>
      <ul>
        {affaires.map((a) => (
          <li key={a.id}>
            <strong>{a.numero}</strong> — {a.client} / {a.projet} — {a.joints.length} joint(s),{" "}
            {a.fncs.length} FNC
          </li>
        ))}
      </ul>
    </main>
  );
}
