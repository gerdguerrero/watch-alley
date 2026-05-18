import type { Metadata } from "next";
import { JetBrains_Mono, Petrona, Spectral } from "next/font/google";
import "./globals.css";

// Editorial register, per the design system:
//   • Petrona — serif, headlines + watch names, italic in gold for emphasis
//   • Spectral — serif, body copy
//   • JetBrains Mono — eyebrows, labels, section numbers, all-caps with wide tracking
//
// next/font self-hosts these, preloads them, and registers @font-face under the
// canonical family names ("Petrona", "Spectral", "JetBrains Mono") that our
// Tailwind @theme block references as literals.
const petrona = Petrona({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-petrona",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Watch Alley PH — Pre-owned & Brand New Timepieces",
  description:
    "A Manila-based curator of pre-owned and brand-new timepieces. Daylight-photographed, disclosed in writing, shipped insured worldwide.",
  metadataBase: new URL("https://watchalley.ph"),
  openGraph: {
    type: "website",
    title: "The Watch Alley PH",
    description: "A Manila-based curator of pre-owned and brand-new timepieces.",
    url: "https://watchalley.ph",
    siteName: "The Watch Alley",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${petrona.variable} ${spectral.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
