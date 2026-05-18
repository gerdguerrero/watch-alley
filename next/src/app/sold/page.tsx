import type { Metadata } from "next";
import { fetchWatches } from "@/lib/inventory/queries";
import { TopBar } from "@/components/storefront/TopBar";
import { MainNav } from "@/components/storefront/MainNav";
import { SoldRow } from "@/components/storefront/SoldRow";

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
    <>
      <TopBar />
      <MainNav active="sold" />
      <main className="flex-1 px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,96px)]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
              Sold Archive
            </div>
            <h1 className="mt-2 font-serif text-[clamp(32px,4vw,48px)] leading-tight text-[color:var(--color-cream)]">
              Recently <em className="italic text-[color:var(--color-gold)]">honored.</em>
            </h1>
          </div>
          <p className="max-w-[540px] font-sans text-sm leading-[1.65] text-[color:var(--color-cream-60)]">
            A running record of pieces that found a home through The Watch
            Alley. If you missed one, message us — similar references come
            around.
          </p>
        </header>

        {sold.length === 0 ? (
          <p className="py-12 font-sans italic text-[color:var(--color-cream-60)]">
            Once pieces find their next collector, they will appear here.
          </p>
        ) : (
          <div className="flex flex-col border-t border-[color:var(--color-gold-20)]">
            {sold.map((w) => (
              <SoldRow key={w.slug} watch={w} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
