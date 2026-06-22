import type { Metadata } from "next";
import { PageTitle } from "@/components/develop/page-title";
import { WatchCard } from "@/components/develop/watch-card";
import { WatchTile } from "@/components/develop/watch-tile";
import { CatalogToolbar } from "@/components/storefront/CatalogToolbar";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { fetchWatches } from "@/lib/inventory/queries";
import { collectBrands, SOLD_SORTS, type SortKey, sortWatches } from "@/lib/inventory/sort";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sold Archive",
  description:
    "A running record of watches placed through The Watch Alley. Browse what we've sold; message us when a similar reference comes around.",
  alternates: { canonical: "/sold" },
};

export default async function SoldPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; sort?: string }>;
}) {
  const { brand, sort } = await searchParams;
  const all = await fetchWatches({ status: "sold" });

  const brands = collectBrands(all);
  const filtered = brand ? all.filter((w) => w.brand === brand) : all;
  // Default to newest sales first - sold_at is "YYYY-MM" so lexicographic compare works.
  const sold = sortWatches(filtered, (sort as SortKey) || "recent");

  return (
    <main className="bg-[#080706] text-zinc-100">
      <PageTitle
        title="SOLD"
        eyebrow="◆ Recently honored"
        description="A running record of watches placed through The Watch Alley. If you missed one, message us; similar references come around."
        variant="catalog"
      />

      <section className="relative px-6 md:px-12 lg:px-20 pb-32">
        <CatalogToolbar brands={brands} sortOptions={SOLD_SORTS} />

        {sold.length === 0 ? (
          <p className="py-12 text-center text-zinc-500 italic font-serif text-lg">
            {all.length > 0
              ? "No sold pieces match this brand. Clear the filter to see the full archive."
              : "Once pieces find their next collector, they will appear here."}
          </p>
        ) : (
          <>
            {/* Mobile: Instagram-style 3-up image tiles, full-bleed, tight gaps */}
            <div className="grid grid-cols-3 gap-0.5 -mx-6 md:hidden">
              {sold.map((w) => (
                <WatchTile key={w.slug} watch={w} />
              ))}
            </div>

            {/* Tablet/desktop: immersive rich cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 max-w-[1680px] mx-auto">
              {sold.map((w, i) => (
                <WatchCard key={w.slug} watch={w} index={i} variant="sold" />
              ))}
            </div>
          </>
        )}
      </section>
      <UsdPriceMount />
    </main>
  );
}
