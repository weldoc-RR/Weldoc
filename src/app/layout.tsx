import "./globals.css";
import { archivo, plexSans } from "./fonts";
import { Header } from "./header";

export const metadata = {
  title: "Weldoc",
  description:
    "Plateforme de préparation, réalisation, contrôle, traçabilité et constitution des dossiers de fabrication et réglementaires.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${archivo.variable} ${plexSans.variable}`}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
