import { Archivo, IBM_Plex_Sans } from "next/font/google";

// Identité visuelle de Weldoc (voir globals.css pour les couleurs) :
// Archivo pour les titres (une allure technique, un peu condensée, qui
// tranche sur le texte courant) et IBM Plex Sans pour le corps — une
// famille dessinée à l'origine pour de l'outillage technique/industriel,
// cohérente avec le domaine (soudage, contrôle, traçabilité). Chargées via
// next/font (auto-hébergées par Next.js, pas de requête externe au
// chargement) plutôt qu'un <link> Google Fonts classique.
export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
