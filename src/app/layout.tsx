import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Takkle — High School Football Recruiting",
    template: "%s | Takkle",
  },
  description:
    "Build your recruiting profile. Show your game. Get discovered. Tackle Score™ rankings, film, and recruiter discovery for high school football.",
  metadataBase: new URL("https://takkle.com"),
  openGraph: {
    title: "Takkle — High School Football Recruiting",
    description:
      "Player-first recruiting platform with Tackle Score™, film, and recruiter discovery.",
    url: "https://takkle.com",
    siteName: "Takkle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Takkle — High School Football Recruiting",
    description: "Build your recruiting profile. Show your game. Get discovered.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={bebasNeue.variable}>
      <body className="min-h-screen flex flex-col antialiased">
        {/*
          THESIS: Player recruiting identity as official-visit dossier — not a stats warehouse.
          OWN-WORLD: Night field #070B14/#0E1624, orange #FF6A00, turf #1FAF6B; Bebas display digits.
          STORY: Claim profile → film → Tackle Score™ → rankings → discovery; NIL Rules stay linked.
          FIRST VIEWPORT: TAKKLE brand, one headline, one sentence, Claim + Find CTAs, field lights.
          FORM: Official visit dossier (seed 3724acb6 idx4) raised with digit-bank score + film window.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        */}
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
