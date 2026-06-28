import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CachyList",
  description:
    "Organize tudo o que você assiste, joga, lê e acompanha. Animes, séries, filmes, livros e jogos em um só lugar.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${bebas.variable}`}>
      <body className="antialiased m-0 min-h-screen">
        <NextTopLoader
          color="#8d63ff"
          height={2}
          shadow="0 0 8px #8d63ff, 0 0 4px #8d63ff"
          showSpinner={false}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
