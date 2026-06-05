import Image from "next/image";
import Link from "next/link";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";

interface WatchTileProps {
  watch: Watch;
}

/**
 * Instagram-style image tile for the mobile catalog grid. Pure image with a
 * discreet price chip overlaid bottom-left (mirroring IG's view-count badge).
 * No hover/parallax — stays a Server Component, so it ships zero client JS.
 * Used only at `< md`; tablet/desktop render the rich {@link WatchCard}.
 */
export function WatchTile({ watch }: WatchTileProps) {
  const isSold = watch.status === "sold";
  const price = isSold && watch.soldPrice ? watch.soldPrice : watch.price;
  const priceLabel = formatPhp(price);

  return (
    <Link
      href={`/watch/${watch.slug}`}
      className="group relative block overflow-hidden bg-black/40"
      style={{ aspectRatio: "4 / 5" }}
    >
      {watch.primaryImage ? (
        <Image
          src={watch.primaryImage}
          alt={`${watch.brand} ${watch.name}`}
          fill
          className={isSold ? "object-cover [filter:grayscale(0.6)]" : "object-cover"}
          sizes="33vw"
        />
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}

      {/* Bottom scrim so the price stays legible over any photo */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

      {priceLabel && (
        <span className="absolute bottom-1.5 left-1.5 font-serif text-[11px] leading-none text-amber-300 drop-shadow">
          {priceLabel}
        </span>
      )}
    </Link>
  );
}
