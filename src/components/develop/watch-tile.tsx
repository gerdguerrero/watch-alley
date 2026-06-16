import Image from "next/image";
import Link from "next/link";
import { formatCategory, formatPhp } from "@/lib/inventory/format";
import { thumbnailUrl } from "@/lib/inventory/image";
import type { Watch } from "@/lib/inventory/types";

interface WatchTileProps {
  watch: Watch;
}

/**
 * Instagram-style image tile for the mobile catalog grid. Mirrors the desktop
 * {@link WatchCard}: the detail (brand, name, category, price) is overlaid on
 * the photo over a gradient scrim, not stacked below it. No hover/parallax —
 * stays a Server Component, so it ships zero client JS. Used only at `< md`.
 */
export function WatchTile({ watch }: WatchTileProps) {
  const isSold = watch.status === "sold";
  const isReserved = watch.status === "reserved" && !isSold;
  const priceLabel = formatPhp(watch.price);
  const categoryLabel =
    formatCategory(watch.category) || watch.edition || watch.conditionLabel || watch.brand;

  return (
    <Link
      href={`/watch/${watch.slug}`}
      className="group relative block overflow-hidden bg-black/40"
      style={{ aspectRatio: "4 / 5" }}
    >
      {watch.primaryImage ? (
        <Image
          src={thumbnailUrl(watch.primaryImage)}
          alt={`${watch.brand} ${watch.name}`}
          fill
          className={isSold ? "object-cover [filter:grayscale(0.6)]" : "object-cover"}
          sizes="33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      {/* Light scrim — keeps the photo visible behind the overlaid text while
          a text-shadow (below) carries legibility over bright watch photos. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      {!isSold && (
        <div className="absolute left-1 top-1 right-1 flex flex-wrap gap-1">
          {isReserved && (
            <span className="border border-amber-300/70 bg-amber-300/90 px-1 py-px text-[5px] uppercase leading-tight tracking-[0.1em] text-black">
              Reserved
            </span>
          )}
          {watch.badge && (
            <span className="max-w-[70%] border border-amber-300/40 bg-black/50 px-1 py-px text-[5px] uppercase leading-tight tracking-[0.1em] text-amber-300 backdrop-blur-sm">
              {watch.badge}
            </span>
          )}
        </div>
      )}
      {isSold && (
        <span className="absolute top-1 left-1 border border-white/20 bg-black/60 px-1 py-px text-[5px] uppercase leading-tight tracking-[0.1em] text-cream-60 backdrop-blur-sm">
          Sold
        </span>
      )}

      {/* Detail overlaid bottom-left, anchored to the image — like desktop */}
      <div className="absolute inset-x-0 bottom-0 p-2 [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
        <p className="text-[8px] uppercase tracking-[0.2em] text-amber-300/80">{watch.brand}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[11px] font-light leading-tight text-cream">
          {watch.name}
        </h3>
        {categoryLabel && (
          <p className="mt-1 text-[7px] uppercase tracking-[0.15em] text-cream-60">
            {categoryLabel}
          </p>
        )}
        {!isSold && priceLabel && (
          <p className="mt-1 font-serif text-[12px] text-amber-300">{priceLabel}</p>
        )}
      </div>
    </Link>
  );
}
