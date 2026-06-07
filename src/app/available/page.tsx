import type { Metadata } from "next";
import { PageTitle } from "@/components/develop/page-title";
import { WatchCard } from "@/components/develop/watch-card";
import { WatchTile } from "@/components/develop/watch-tile";
import { CatalogToolbar } from "@/components/storefront/CatalogToolbar";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { fetchWatches } from "@/lib/inventory/queries";
import { AVAILABLE_SORTS, collectBrands, type SortKey, sortWatches } from "@/lib/inventory/sort";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Available Pieces — The Watch Alley PH",
  description:
    "Every available watch in our current rotation. Pre-owned and brand-new timepieces curated in Manila, daylight-photographed, disclosed in writing.",
  alternates: { canonical: "/available" },
};

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "brand-new", label: "Brand New" },
  { value: "pre-owned", label: "Pre-owned" },
  { value: "limited-edition", label: "Limited Edition" },
] as const;

export default async function AvailablePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; brand?: string; sort?: string }>;
}) {
  const { category, brand, sort } = await searchParams;
  // "limited-edition" is a badge filter, not a category
  const isBadge = category === "limited-edition";
  const all = await fetchWatches({
    status: "live",
    category: isBadge ? undefined : category,
    badge: isBadge ? "limited-edition" : undefined,
  });

  // Brand list reflects the current category, so the menu only offers brands
  // you can actually land on. Brand + sort are applied in-memory.
  const brands = collectBrands(all);
  const filtered = brand ? all.filter((w) => w.brand === brand) : all;
  const watches = sortWatches(filtered, (sort as SortKey) || "featured");

  return (
    <main className="bg-[#080706] text-zinc-100">
      <PageTitle title="AVAILABLE" eyebrow="◆ Currently in rotation" variant="catalog" />

      <section className="relative px-6 md:px-12 lg:px-20 pb-32">
        <CatalogToolbar brands={brands} sortOptions={AVAILABLE_SORTS} categories={CATEGORIES} />

        {watches.length === 0 ? (
          <p className="py-12 text-center text-zinc-500 italic font-serif text-lg">
            {all.length > 0
              ? "No pieces match these filters. Try clearing the brand or category."
              : "No active pieces right now. Message us on Messenger for the next drop."}
          </p>
        ) : (
          <>
            {/* Mobile: Instagram-style 3-up image tiles, full-bleed, tight gaps */}
            <div className="grid grid-cols-3 gap-0.5 -mx-6 md:hidden">
              {watches.map((w) => (
                <WatchTile key={w.slug} watch={w} />
              ))}
            </div>

            {/* Tablet/desktop: immersive rich cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 max-w-[1680px] mx-auto">
              {watches.map((w, i) => (
                <WatchCard key={w.slug} watch={w} index={i} />
              ))}
            </div>
          </>
        )}

        <p className="mx-auto mt-20 max-w-[60ch] text-center font-mono text-[10px] uppercase leading-[1.6] tracking-[0.18em] text-zinc-600">
          USD conversions sourced live from Wise. Final amount calculated at payment.
        </p>
      </section>
      <UsdPriceMount />
    </main>
  );
}
