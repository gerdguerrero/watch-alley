import type { Metadata } from "next";
import { PageTitle } from "@/components/develop/page-title";
import { AvailableCatalog } from "@/components/storefront/AvailableCatalog";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { fetchWatches } from "@/lib/inventory/queries";
import { AVAILABLE_SORTS } from "@/lib/inventory/sort";

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
  searchParams: Promise<{ category?: string; brand?: string; sort?: string; q?: string }>;
}) {
  const { category, brand, sort, q } = await searchParams;
  // "limited-edition" is a badge filter, not a category
  const isBadge = category === "limited-edition";
  const all = await fetchWatches({
    status: "live",
    category: isBadge ? undefined : category,
    badge: isBadge ? "limited-edition" : undefined,
  });
  return (
    <main className="bg-[#080706] text-zinc-100">
      <PageTitle title="AVAILABLE" eyebrow="◆ Currently in rotation" variant="catalog" />

      <section className="relative px-6 md:px-12 lg:px-20 pb-32">
        <AvailableCatalog
          watches={all}
          categories={CATEGORIES}
          sortOptions={AVAILABLE_SORTS}
          initialBrand={brand}
          initialSort={sort}
          initialQuery={q}
        />

        <p className="mx-auto mt-20 max-w-[60ch] text-center font-mono text-[10px] uppercase leading-[1.6] tracking-[0.18em] text-zinc-600">
          USD conversions sourced live from Wise. Final amount calculated at payment.
        </p>
      </section>
      <UsdPriceMount />
    </main>
  );
}
