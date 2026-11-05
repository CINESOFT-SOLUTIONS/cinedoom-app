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
  title: "CineDoom",
  description: "Plataforma de gestão de cinemas, bilheteria presencial e reservas online para clientes.",
  icons: {
    icon: "/logos/cinedoom-icon.png",
    shortcut: "/logos/cinedoom-icon.png",
    apple: "/logos/cinedoom-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body className={`${poppins.variable} font-sans min-h-screen bg-darkBg text-neutralBg antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
