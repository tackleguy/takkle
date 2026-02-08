import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Takkle — Can Your High School Athlete Get NIL Deals?",
  description:
    "Free tool to check your state's high school NIL rules. Find out if your athlete can earn money from Name, Image, and Likeness deals. All 50 states + D.C. covered.",
  metadataBase: new URL("https://takkle.com"),
  openGraph: {
    title: "Takkle — Can Your High School Athlete Get NIL Deals?",
    description:
      "Free tool to check your state's high school NIL rules. Find out if your athlete can earn money from Name, Image, and Likeness deals.",
    url: "https://takkle.com",
    siteName: "Takkle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Takkle — Can Your High School Athlete Get NIL Deals?",
    description:
      "Free tool to check your state's high school NIL rules. All 50 states + D.C. covered.",
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
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
