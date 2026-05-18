import { fetchWatches } from "@/lib/inventory/queries";
import { fetchJournalPosts } from "@/lib/journal/queries";
import { TopBar } from "@/components/storefront/TopBar";
import { MainNav } from "@/components/storefront/MainNav";
import { HeroSection } from "@/components/storefront/HeroSection";
import { ArrivalsCarousel } from "@/components/storefront/ArrivalsCarousel";
import { JournalPreview } from "@/components/storefront/JournalPreview";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";

// ISR via the Previous Model. Cache Components (`'use cache'` + `cacheLife`)
// is the Next 16 SOTA pattern but ships with unstable surface area; we'll
// migrate phase-by-phase once the rest of the app is in place. See
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
export const revalidate = 60;

export default async function HomePage() {
  // Run the two independent reads in parallel — no waterfall on the page load.
  const [watches, journalPosts] = await Promise.all([
    fetchWatches({ status: "available" }),
    fetchJournalPosts(4),
  ]);

  const featured = watches.find((w) => w.featured) ?? watches[0] ?? null;
  // Hide the featured piece from the carousel so it isn't shown twice.
  const arrivals = featured
    ? watches.filter((w) => w.slug !== featured.slug)
    : watches;

  return (
    <>
      <TopBar />
      <MainNav />
      <HeroSection featured={featured} />
      <ArrivalsCarousel watches={arrivals} />
      <JournalPreview posts={journalPosts} />
      <UsdPriceMount />
    </>
  );
}
