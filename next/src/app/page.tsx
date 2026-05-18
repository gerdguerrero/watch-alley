import { fetchWatches } from "@/lib/inventory/queries";
import { TopBar } from "@/components/storefront/TopBar";
import { MainNav } from "@/components/storefront/MainNav";
import { HeroSection } from "@/components/storefront/HeroSection";
import { ArrivalsCarousel } from "@/components/storefront/ArrivalsCarousel";

// ISR via the Previous Model. Cache Components (`'use cache'` + `cacheLife`)
// is the Next 16 SOTA pattern but ships with unstable surface area; we'll
// migrate phase-by-phase once the rest of the app is in place. See
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
export const revalidate = 60;

export default async function HomePage() {
  // Single inventory fetch on the server. Featured watch + arrivals carousel
  // are derived from this — no second round trip, no per-component fetch.
  const watches = await fetchWatches({ status: "available" });
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
    </>
  );
}
