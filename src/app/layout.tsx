import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CineDoom — Plataforma de Gestao de Cinemas e Bilheteria",
  description: "Sistema SaaS multi-tenant para gestao de cinemas, bilheteria com trava ACID e Portal do Cliente.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-darkBg text-neutralBg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
