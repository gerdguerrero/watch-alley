import Image from "next/image";
import Link from "next/link";
import { badgeIsBrandNew, formatPhp, formatWatchMeta } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";

interface WatchCardProps {
  watch: Watch;
}

/**
 * Storefront watch card. Used by the homepage arrivals carousel, the
 * dedicated /available grid, and any future "related pieces" surface.
 *
 * Server Component - no event handlers. The whole card is a <Link>, so click
 * + keyboard activation work without any client-side JS.
 */
export function WatchCard({ watch }: WatchCardProps) {
  const meta = formatWatchMeta([watch.movement, watch.caseSize, watch.edition || watch.set]);
  const brandNew = badgeIsBrandNew(watch.badge);
  const isReserved = watch.status === "reserved";

  return (
    <Link
      href={`/watch/${watch.slug}`}
      data-watch-slug={watch.slug}
      className="group flex h-full w-[320px] min-w-0 shrink-0 flex-col border border-[color:var(--color-gold-20)] bg-[color:var(--color-card)] text-inherit transition-transform duration-200 hover:-translate-y-1 hover:border-[color:var(--color-gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-background">
        {watch.primaryImage && (
          <Image
            src={watch.primaryImage}
            alt={`${watch.brand} ${watch.name}`}
            fill
            sizes="(min-width: 1024px) 320px, 80vw"
            className="object-cover"
          />
        )}
        {(isReserved || watch.badge) && (
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
            {isReserved && (
              <span className="border border-[color:var(--color-gold)] bg-[color:var(--color-gold)] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-background">
                Reserved
              </span>
            )}
            {watch.badge && (
              <span
                className={`border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.22em] ${
                  brandNew
                    ? "border-[color:var(--color-gold)] bg-background/70 text-[color:var(--color-gold)]"
                    : "border-[color:var(--color-gold-20)] bg-background/70 text-[color:var(--color-cream)]"
                }`}
              >
                {watch.badge}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="min-w-0 break-words font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
            {watch.brand}
          </span>
          {watch.conditionLabel && (
            <span className="shrink-0 font-mono text-[11px] text-[color:var(--color-cream-60)]">
              {watch.conditionLabel}
            </span>
          )}
        </div>
        <div className="break-words font-serif text-lg leading-tight text-[color:var(--color-cream)]">
          {watch.name}
        </div>
        {meta && (
          <div className="break-words font-mono text-[10px] uppercase tracking-[0.1em] text-[color:rgba(236,228,211,0.5)]">
            {meta}
          </div>
        )}
        {watch.description && (
          <p className="mt-1 line-clamp-3 font-sans text-[13px] leading-snug text-[color:var(--color-cream-80)]">
            {watch.description}
          </p>
        )}
        <div className="mt-auto flex min-w-0 items-baseline justify-between gap-3 border-t border-[color:var(--color-gold-20)] pt-4">
          <span className="min-w-0 font-serif text-xl text-[color:var(--color-gold)]">
            {formatPhp(watch.price)}
            {/* Filled in by <UsdPriceMount /> after hydration. */}
            <span
              className="mt-0.5 block font-mono text-[10px] font-normal not-italic tracking-[0.18em] text-[color:var(--color-cream-60)]"
              data-price-php={watch.price}
            />
          </span>
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] transition-colors group-hover:text-[color:var(--color-gold)]">
            DETAILS →
          </span>
        </div>
      </div>
    </Link>
  );
}
