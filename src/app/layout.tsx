import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Footer } from "@/components/develop/footer";
import { MainNav } from "@/components/develop/main-nav";
import { WatchListModal } from "@/components/watch-list/WatchListModal";
import { BRAND_COLORS } from "@/lib/brand/assets";
import { fetchFeaturedWatch } from "@/lib/inventory/queries";
import { FALLBACK_SITE_OG_IMAGE, resolveMetadataImageUrl } from "@/lib/metadata/images";
import { buildSiteJsonLd, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/seo/schema";
import "./globals.css";

// Develop-branch font stack (replaces the Petrona/Spectral/JetBrains_Mono set):
//   • Playfair Display - serif, headlines + watch names, italic emphasis
//   • Geist - sans, body copy and UI
//   • Geist Mono - eyebrows, labels, all-caps tracking-wide
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

// Keep site-level metadata on the same freshness window as the inventory pages.
// When the admin changes the featured available watch, the homepage/general OG
// image refreshes after ISR and fetch-cache revalidation instead of requiring a code change.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const featured = await fetchFeaturedWatch();
  const featuredImage = resolveMetadataImageUrl(featured?.primaryImage);
  const siteOgImage = featuredImage ?? FALLBACK_SITE_OG_IMAGE;
  const siteOgImageAlt =
    featuredImage && featured
      ? `The Watch Alley featured watch: ${featured.brand} ${featured.name}`
      : "The Watch Alley curated watch photography";

  return {
    title: {
      default: SITE_TITLE,
      template: "%s | The Watch Alley",
    },
    description: SITE_DESCRIPTION,
    metadataBase: new URL(SITE_URL),
    applicationName: "The Watch Alley",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png", sizes: "512x512" },
      ],
      shortcut: ["/favicon.ico"],
      apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "512x512" }],
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      siteName: "The Watch Alley",
      locale: "en_PH",
      images: [
        {
          url: siteOgImage,
          alt: siteOgImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [siteOgImage],
    },
  };
}

// Viewport is its own export in Next.js 16 - `themeColor` inside metadata is
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
  const siteJsonLd = buildSiteJsonLd();

  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#080706] text-zinc-100 font-sans">
        <MainNav />
        <div className="flex-1">{children}</div>
        <Footer />
        <WatchListModal />
        <Analytics />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org JSON-LD is generated from static site constants.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </body>
    </html>
  );
}
