import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/develop/page-title";
import { WatchCard } from "@/components/develop/watch-card";
import { WatchTile } from "@/components/develop/watch-tile";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { fetchWatches } from "@/lib/inventory/queries";

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
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  // "limited-edition" is a badge filter, not a category
  const isBadge = category === "limited-edition";
  const watches = await fetchWatches({
    status: "available",
    category: isBadge ? undefined : category,
    badge: isBadge ? "limited-edition" : undefined,
  });

  return (
    <main className="bg-[#080706] text-zinc-100">
      <PageTitle title="AVAILABLE" eyebrow="◆ Currently in rotation" variant="catalog" />

      <section className="relative px-6 md:px-12 lg:px-20 pb-32">
        {/* Category filter pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-[1680px] mx-auto">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.value || (!category && cat.value === "");
            return (
              <Link
                key={cat.value}
                href={cat.value ? `/available?category=${cat.value}` : "/available"}
                className={`px-4 py-2 rounded-full font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  isActive
                    ? "bg-amber-500 text-zinc-900 border border-amber-500"
                    : "bg-transparent text-zinc-400 border border-zinc-700 hover:border-amber-500/50 hover:text-amber-400"
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {watches.length === 0 ? (
          <p className="py-12 text-center text-zinc-500 italic font-serif text-lg">
            No active pieces right now. Message us on Messenger for the next drop.
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
