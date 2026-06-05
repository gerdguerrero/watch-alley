import type { Metadata } from "next";
import { PageTitle } from "@/components/develop/page-title";
import { WatchCard } from "@/components/develop/watch-card";
import { WatchTile } from "@/components/develop/watch-tile";
import { fetchWatches } from "@/lib/inventory/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sold Archive — The Watch Alley PH",
  description:
    "A running record of watches placed through The Watch Alley. Browse what we've sold; message us when a similar reference comes around.",
  alternates: { canonical: "/sold" },
};

export default async function SoldPage() {
  const sold = await fetchWatches({ status: "sold" });
  // Newest sales first — sold_at is "YYYY-MM" so lexicographic compare works.
  sold.sort((a, b) => (b.soldAt || "").localeCompare(a.soldAt || ""));

  return (
    <main className="bg-[#080706] text-zinc-100">
      <PageTitle
        title="SOLD"
        eyebrow="◆ Recently honored"
        description="A running record of watches placed through The Watch Alley. If you missed one, message us — similar references come around."
        variant="catalog"
      />

      <section className="relative px-6 md:px-12 lg:px-20 pb-32">
        {sold.length === 0 ? (
          <p className="py-12 text-center text-zinc-500 italic font-serif text-lg">
            Once pieces find their next collector, they will appear here.
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
    </main>
  );
}
