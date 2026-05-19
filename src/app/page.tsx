import { ArrivalsCarousel } from "@/components/storefront/ArrivalsCarousel";
import { BuyingProcess } from "@/components/storefront/BuyingProcess";
import { ContactSection } from "@/components/storefront/ContactSection";
import { CuratorNote } from "@/components/storefront/CuratorNote";
import { FinalCta } from "@/components/storefront/FinalCta";
import { Footer } from "@/components/storefront/Footer";
import { HeroSection } from "@/components/storefront/HeroSection";
import { HeroTicker } from "@/components/storefront/HeroTicker";
import { InquiryBand } from "@/components/storefront/InquiryBand";
import { JournalPreview } from "@/components/storefront/JournalPreview";
import { MainNav } from "@/components/storefront/MainNav";
import { SoldArchivePreview } from "@/components/storefront/SoldArchivePreview";
import { TopBar } from "@/components/storefront/TopBar";
import { TrustBand } from "@/components/storefront/TrustBand";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { fetchWatches } from "@/lib/inventory/queries";
import { fetchJournalPosts } from "@/lib/journal/queries";

// ISR via the Previous Model. Cache Components (`'use cache'` + `cacheLife`)
// is the Next 16 SOTA pattern but ships with unstable surface area; we'll
// migrate phase-by-phase once the rest of the app is in place. See
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
export const revalidate = 60;

export default async function HomePage() {
  // Run the independent reads in parallel — no waterfall on the page load.
  const [available, sold, journalPosts] = await Promise.all([
    fetchWatches({ status: "available" }),
    fetchWatches({ status: "sold", limit: 5 }),
    fetchJournalPosts(4),
  ]);

  const featured = available.find((w) => w.featured) ?? available[0] ?? null;
  // Hide the featured piece from the carousel so it isn't shown twice.
  const arrivals = featured
    ? available.filter((w) => w.slug !== featured.slug)
    : available;

  return (
    <>
      <TopBar />
      <MainNav />
      <HeroSection featured={featured} />
      <HeroTicker />
      <TrustBand />
      <JournalPreview posts={journalPosts} />
      <ArrivalsCarousel watches={arrivals} />
      <SoldArchivePreview watches={sold} />
      <BuyingProcess />
      <InquiryBand />
      <CuratorNote />
      <ContactSection />
      <FinalCta />
      <Footer />
      <UsdPriceMount />
    </>
  );
}
