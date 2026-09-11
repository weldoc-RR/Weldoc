"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Affaire = { id: string; numero: string };
type Joint = { id: string; numero: string; indiceReparation: number; affaireId: string };

// Scan 3D — deuxième méthode du TQC (voir le cahier des charges, "TQC
// (TEL QUE CONSTRUIT)" > "Scan 3D") : trace d'un scan externe déjà réalisé
// sur une zone (fichier source, opérateur, date, logiciel/version, fichier
// généré, ISO/TQC résultant) — voir POST /api/scans-tqc. Une zone peut
// couvrir plusieurs joints à la fois ; comme pour la matière (CCPU), rien
// n'est ressaisi ici que ce qui n'existe pas déjà ailleurs.
export function AjouterScanTqc({ affaires, joints }: { affaires: Affaire[]; joints: Joint[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [affaireId, setAffaireId] = useState("");
  const [zone, setZone] = useState("");
  const [dateScan, setDateScan] = useState("");
  const [logiciel, setLogiciel] = useState("");
  const [versionLogiciel, setVersionLogiciel] = useState("");
  const [fichierSourceUrl, setFichierSourceUrl] = useState("");
  const [fichierGenereUrl, setFichierGenereUrl] = useState("");
  const [isoResultantUrl, setIsoResultantUrl] = useState("");
  const [jointIds, setJointIds] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} style={{ marginBottom: "1rem" }}>
        + Ajouter un scan 3D
      </button>
    );
  }

  const jointsDeLAffaire = joints.filter((j) => j.affaireId === affaireId);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/scans-tqc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affaireId,
        zone,
        dateScan: new Date(dateScan).toISOString(),
        logiciel: logiciel || undefined,
        versionLogiciel: versionLogiciel || undefined,
        fichierSourceUrl,
        fichierGenereUrl: fichierGenereUrl || undefined,
        isoResultantUrl: isoResultantUrl || undefined,
        jointIds,
      }),
    });

    setEnCours(false);
    if (!res.ok) {
      setErreur("Impossible d'enregistrer ce scan.");
      return;
    }
    setAffaireId("");
    setZone("");
    setDateScan("");
    setLogiciel("");
    setVersionLogiciel("");
    setFichierSourceUrl("");
    setFichierGenereUrl("");
    setIsoResultantUrl("");
    setJointIds([]);
    setOuvert(false);
    router.refresh();
  }

  return (
    <form onSubmit={ajouter} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 480, marginBottom: "1.5rem", border: "1px solid var(--couleur-bordure)", padding: "1rem" }}>
      <p style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)", margin: 0 }}>
        Un scan déjà réalisé par un prestataire ou un logiciel externe — Weldoc n&apos;en garde que la trace (lien
        vers les fichiers), pas de dessin ni d&apos;import 3D directement ici.
      </p>
      <label>
        Affaire
        <select
          required
          value={affaireId}
          onChange={(e) => {
            setAffaireId(e.target.value);
            setJointIds([]);
          }}
          style={{ display: "block", width: "100%", padding: "0.4rem" }}
        >
          <option value="">— choisir —</option>
          {affaires.map((a) => (
            <option key={a.id} value={a.id}>
              {a.numero}
            </option>
          ))}
        </select>
      </label>
      <label>
        Zone couverte (ex. ligne 12, salle des machines...)
        <input required type="text" value={zone} onChange={(e) => setZone(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Date du scan
        <input required type="date" value={dateScan} onChange={(e) => setDateScan(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <label style={{ flex: 1 }}>
          Logiciel (optionnel)
          <input type="text" value={logiciel} onChange={(e) => setLogiciel(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
        <label style={{ flex: 1 }}>
          Version (optionnel)
          <input type="text" value={versionLogiciel} onChange={(e) => setVersionLogiciel(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
        </label>
      </div>
      <label>
        Lien vers le fichier source du scan
        <input required type="text" value={fichierSourceUrl} onChange={(e) => setFichierSourceUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers le fichier généré (optionnel)
        <input type="text" value={fichierGenereUrl} onChange={(e) => setFichierGenereUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      <label>
        Lien vers l&apos;ISO/TQC résultant (optionnel)
        <input type="text" value={isoResultantUrl} onChange={(e) => setIsoResultantUrl(e.target.value)} style={{ display: "block", width: "100%", padding: "0.4rem" }} />
      </label>
      {affaireId && jointsDeLAffaire.length > 0 && (
        <label style={{ fontSize: "0.85rem" }}>
          Joints couverts par cette zone (optionnel, plusieurs possibles — Ctrl/Cmd + clic)
          <select
            multiple
            size={Math.min(4, jointsDeLAffaire.length)}
            onChange={(e) => setJointIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            style={{ display: "block", width: "100%", padding: "0.3rem" }}
          >
            {jointsDeLAffaire.map((j) => (
              <option key={j.id} value={j.id}>
                {j.indiceReparation > 0 ? `${j.numero} R${j.indiceReparation}` : j.numero}
              </option>
            ))}
          </select>
        </label>
      )}
      <div>
        <button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement..." : "Enregistrer le scan"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} style={{ marginLeft: "0.5rem" }}>
          Annuler
        </button>
      </div>
      {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
    </form>
  );
}
