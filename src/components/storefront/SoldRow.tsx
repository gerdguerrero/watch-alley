import Image from "next/image";
import Link from "next/link";
import type { Watch } from "@/lib/inventory/types";

interface SoldRowProps {
  watch: Watch;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatSoldMonth(soldAt: string): string {
  if (!/^\d{4}-\d{2}/.test(soldAt)) return "";
  const [year, month] = soldAt.split("-");
  const idx = Math.max(0, Math.min(11, Number(month) - 1));
  return `${MONTHS[idx]} ${year}`;
}

function formatSoldPrice(price: number | null): string {
  if (!price || price <= 0) return "";
  return `₱ ${price.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

/**
 * Editorial ledger row for the Sold Archive. Photo demoted to a 56×56
 * marginalia square — this is intentionally NOT a graveyard of full cards.
 *
 * Server Component. The whole row is a <Link> so keyboard activation works
 * without any client JS.
 */
export function SoldRow({ watch }: SoldRowProps) {
  const month = formatSoldMonth(watch.soldAt);
  const price = formatSoldPrice(watch.soldPrice);

  return (
    <Link
      href={`/watch/${watch.slug}`}
      data-watch-slug={watch.slug}
      className="group grid grid-cols-[56px_1fr_auto] items-center gap-[clamp(16px,3vw,28px)] border-b border-[color:var(--color-gold-20)] py-[clamp(18px,2.5vw,24px)] text-inherit transition-colors hover:bg-[rgba(201,162,75,0.04)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)] sm:grid-cols-[56px_1fr_auto]"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden opacity-85 [filter:grayscale(0.65)]">
        {watch.primaryImage && (
          <Image src={watch.primaryImage} alt="" fill sizes="56px" className="object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
          {watch.brand}
          {watch.reference && ` · ${watch.reference}`}
        </span>
        <span className="font-serif text-[clamp(18px,1.6vw,22px)] leading-tight text-[color:var(--color-cream)]">
          {watch.name}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        {price && (
          <span className="font-serif text-[clamp(16px,1.6vw,20px)] italic text-[color:var(--color-gold)] [font-variant-numeric:oldstyle-nums_tabular-nums]">
            {price}
          </span>
        )}
        {month && (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
            Placed {month}
          </span>
        )}
      </div>
    </Link>
  );
}
