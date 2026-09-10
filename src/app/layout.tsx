import "./globals.css";

export const metadata = {
  title: "Weldoc",
  description:
    "Plateforme de préparation, réalisation, contrôle, traçabilité et constitution des dossiers de fabrication et réglementaires.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
