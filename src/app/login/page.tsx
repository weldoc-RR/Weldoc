"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Methode = "MOT_DE_PASSE" | "QR_PIN";

export default function LoginPage() {
  const router = useRouter();
  const [methode, setMethode] = useState<Methode>("MOT_DE_PASSE");
  const [matricule, setMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmitMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricule, motDePasse }),
    });

    setEnCours(false);

    if (!res.ok) {
      setErreur("Matricule ou mot de passe incorrect.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function onSubmitQrPin(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const res = await fetch("/api/auth/login-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, pin }),
    });

    setEnCours(false);

    if (!res.ok) {
      setErreur("QR/matricule ou code PIN incorrect.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div
          style={{
            fontFamily: "var(--font-titres)",
            fontWeight: 800,
            fontSize: "1.6rem",
            color: "var(--couleur-primaire-sombre)",
            letterSpacing: "0.02em",
            marginBottom: "0.25rem",
          }}
        >
          WELDOC
        </div>
        <p style={{ color: "var(--couleur-texte-attenue)", marginTop: 0, marginBottom: "1.5rem" }}>Connexion</p>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <button
            type="button"
            onClick={() => setMethode("MOT_DE_PASSE")}
            disabled={methode === "MOT_DE_PASSE"}
            style={{
              flex: 1,
              fontSize: "0.85rem",
              fontWeight: methode === "MOT_DE_PASSE" ? 600 : 400,
              borderColor: methode === "MOT_DE_PASSE" ? "var(--couleur-primaire)" : undefined,
            }}
          >
            Matricule + mot de passe
          </button>
          <button
            type="button"
            onClick={() => setMethode("QR_PIN")}
            disabled={methode === "QR_PIN"}
            style={{
              flex: 1,
              fontSize: "0.85rem",
              fontWeight: methode === "QR_PIN" ? 600 : 400,
              borderColor: methode === "QR_PIN" ? "var(--couleur-primaire)" : undefined,
            }}
          >
            QR + code PIN
          </button>
        </div>

      {methode === "MOT_DE_PASSE" ? (
        <form onSubmit={onSubmitMotDePasse} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label>
            Matricule
            <input
              type="text"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem" }}
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem" }}
            />
          </label>
          {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
          <button
            type="submit"
            disabled={enCours}
            style={{ background: "var(--couleur-primaire)", color: "#fff", borderColor: "var(--couleur-primaire)", fontWeight: 600 }}
          >
            {enCours ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitQrPin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label>
            Matricule ou QR (scanner ou saisir)
            <input
              type="text"
              autoFocus
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem" }}
            />
          </label>
          <label>
            Code PIN
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "0.5rem" }}
            />
          </label>
          <p style={{ fontSize: "0.75rem", color: "var(--couleur-texte-discret)", margin: 0 }}>
            Même code PIN que celui utilisé pour signer un document. À défaut, se connecter avec le mot de passe et
            en définir un depuis sa fiche personnel.
          </p>
          {erreur && <p style={{ color: "var(--couleur-non-conforme)" }}>{erreur}</p>}
          <button
            type="submit"
            disabled={enCours}
            style={{ background: "var(--couleur-primaire)", color: "#fff", borderColor: "var(--couleur-primaire)", fontWeight: 600 }}
          >
            {enCours ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      )}
      </div>
    </main>
  );
}
