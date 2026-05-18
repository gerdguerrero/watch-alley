import type { Metadata } from "next";
import { MainNav } from "@/components/storefront/MainNav";
import { TopBar } from "@/components/storefront/TopBar";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { WatchCard } from "@/components/storefront/WatchCard";
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
    <>
      <TopBar />
      <MainNav active="available" />
      <main className="flex-1 px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,96px)]">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
              Available pieces
            </div>
            <h1 className="mt-2 font-serif text-[clamp(36px,5vw,64px)] leading-tight text-[color:var(--color-cream)]">
              In rotation, <em className="italic text-[color:var(--color-gold)]">right now.</em>
            </h1>
          </div>
          <p className="max-w-[60ch] font-sans text-sm leading-[1.65] text-[color:var(--color-cream-60)]">
            Every watch currently for sale through The Watch Alley. Daylight-photographed, disclosed
            in writing, shipped insured. Tap any piece for full details and to inquire.
          </p>
        </header>

        {watches.length === 0 ? (
          <p className="py-12 text-center font-sans italic text-[color:var(--color-cream-60)]">
            No active pieces right now. Message us on Viber for the next drop.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[clamp(20px,2.5vw,32px)]">
            {watches.map((w) => (
              <WatchCard key={w.slug} watch={w} />
            ))}
          </div>
        )}

        <p className="mx-auto mt-[clamp(36px,6vw,56px)] max-w-[60ch] text-center font-mono text-[10px] uppercase leading-[1.6] tracking-[0.18em] text-[color:var(--color-cream-60)]">
          USD figures shown alongside prices are mid-market estimates, refreshed daily. The final
          amount is calculated in Wise at payment.
        </p>
      </main>
      <UsdPriceMount />
    </>
  );
}
