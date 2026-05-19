import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Privilege Imoveis",
    template: "%s | Privilege Imoveis",
  },

  description: "Onde o privilégio tem endereço.",

  metadataBase: new URL(
    "https://privilegeimoveis.com"
  ),

  openGraph: {
    title: "Privilege Imoveis",

    description:
      "Onde o privilégio tem endereço.",

    siteName: "Privilege Imoveis",

    locale: "pt_BR",

    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}