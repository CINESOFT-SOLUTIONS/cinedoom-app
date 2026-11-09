import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0E1322",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://cinedoom.vercel.app"),
  title: "CineDoom — Plataforma de Gestão e Bilheteria",
  description: "Plataforma de gestão de cinemas, bilheteria presencial e reservas online para clientes.",
  openGraph: {
    title: "CineDoom — Plataforma de Gestão e Bilheteria",
    description: "Plataforma de gestão de cinemas, bilheteria presencial e reservas online para clientes.",
    url: "https://cinedoom.vercel.app",
    siteName: "CineDoom",
    images: [
      {
        url: "/logos/cinedoom-logo-horizontal-color.png",
        width: 1200,
        height: 630,
        alt: "CineDoom Cinema",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CineDoom — Plataforma de Gestão e Bilheteria",
    description: "Plataforma de gestão de cinemas, bilheteria presencial e reservas online para clientes.",
    images: ["/logos/cinedoom-logo-horizontal-color.png"],
  },
  icons: {
    icon: "/logos/cinedoom-icon-color.png",
    shortcut: "/logos/cinedoom-icon-color.png",
    apple: "/logos/cinedoom-icon-color.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="dark" className={poppins.variable}>
      <body className={`${poppins.variable} font-sans min-h-screen liquid-glass-backdrop bg-darkBg text-neutralBg antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
