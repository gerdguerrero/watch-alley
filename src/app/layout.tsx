import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Footer } from "@/components/develop/footer";
import { MainNav } from "@/components/develop/main-nav";
import { BRAND_COLORS } from "@/lib/brand/assets";
import "./globals.css";

// Develop-branch font stack (replaces the Petrona/Spectral/JetBrains_Mono set):
//   • Playfair Display — serif, headlines + watch names, italic emphasis
//   • Geist           — sans, body copy and UI
//   • Geist Mono      — eyebrows, labels, all-caps tracking-wide
//
// next/font self-hosts each and registers their @font-face under the literal
// family names ("Geist", "Geist Mono", "Playfair Display") that the Tailwind
// @theme block in globals.css references.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const SITE_OG_IMAGE =
  "https://yrzawkqcifuubtltktbk.supabase.co/storage/v1/object/public/watches/unsorted/1780396993109-ly5w4f-img-6212.jpeg";

export const metadata: Metadata = {
  title: {
    default: "The Watch Alley PH — Curated Watches in Manila",
    template: "%s · The Watch Alley",
  },
  description:
    "A Manila-based curator of pre-owned and brand-new timepieces. Daylight-photographed, disclosed in writing, and handled with a collector-first concierge standard.",
  metadataBase: new URL("https://watchalley.ph"),
  applicationName: "The Watch Alley",
  // Icons are managed by the file-based metadata API:
  //   src/app/icon.svg          → modern browsers (vector)
  //   src/app/apple-icon.png    → iOS home screen
  //   src/app/favicon.ico       → legacy IE/Edge fallback
  // Next.js auto-emits the correct <link rel="icon" …> tags from those files,
  // so this object only sets things the file convention can't.
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    title: "The Watch Alley PH",
    description: "A Manila-based curator of pre-owned and brand-new timepieces.",
    url: "https://watchalley.ph",
    siteName: "The Watch Alley",
    locale: "en_PH",
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1946,
        height: 1946,
        alt: "The Watch Alley curated watch photography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Watch Alley PH",
    description: "Curated pre-owned and brand-new timepieces, Manila.",
    images: [SITE_OG_IMAGE],
  },
};

// Viewport is its own export in Next.js 16 — `themeColor` inside metadata is
// deprecated. The walnut here matches the page background so iOS Safari's
// chrome blends into the design instead of flashing white.
export const viewport: Viewport = {
  themeColor: BRAND_COLORS.walnut,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#080706] text-zinc-100 font-sans">
        <MainNav />
        <div className="flex-1">{children}</div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
