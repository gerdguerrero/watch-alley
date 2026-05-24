import type { Metadata } from "next";
import { PageTitle } from "@/components/develop/page-title";
import { WatchCard } from "@/components/develop/watch-card";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { fetchWatches } from "@/lib/inventory/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Available Pieces — The Watch Alley PH",
  description:
    "Every available watch in our current rotation. Pre-owned and brand-new timepieces curated in Manila, daylight-photographed, disclosed in writing.",
  alternates: { canonical: "/available" },
};

export default async function AvailablePage() {
  const watches = await fetchWatches({ status: "available" });

  return (
    <main className="bg-[#080706] text-zinc-100">
      <PageTitle
        title="AVAILABLE"
        eyebrow="◆ Currently in rotation"
        headline="In rotation, *right now.*"
        description="Every watch currently for sale through The Watch Alley. Daylight-photographed, disclosed in writing, shipped insured. Tap any piece for full details and to inquire."
      />

      <section className="relative px-6 md:px-12 lg:px-20 pb-32">
        {watches.length === 0 ? (
          <p className="py-12 text-center text-zinc-500 italic font-serif text-lg">
            No active pieces right now. Message us on Messenger for the next drop.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
            {watches.map((w, i) => (
              <WatchCard key={w.slug} watch={w} index={i} />
            ))}
          </div>
        )}

        <p className="mx-auto mt-20 max-w-[60ch] text-center font-mono text-[10px] uppercase leading-[1.6] tracking-[0.18em] text-zinc-600">
          USD conversions sourced live from Wise. Final amount calculated at payment.
        </p>
      </section>
      <UsdPriceMount />
    </main>
  );
}
