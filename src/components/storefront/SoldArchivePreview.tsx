import Link from "next/link";
import { BigNum } from "@/components/storefront/BigNum";
import { SoldRow } from "@/components/storefront/SoldRow";
import type { Watch } from "@/lib/inventory/types";

interface SoldArchivePreviewProps {
  watches: Watch[];
}

/**
 * Recently sold — curatorial preview on the homepage. Renders the most
 * recent sold pieces as ledger rows, with a link to the full archive.
 *
 * Treated as a record, not a graveyard. Buyers see provenance, not "out
 * of stock" energy.
 *
 * Server Component. Receives the slice as a prop so the parent can fetch
 * once and reuse if needed.
 */
export function SoldArchivePreview({ watches }: SoldArchivePreviewProps) {
  if (watches.length === 0) return null;

  return (
    <section
      id="sold-archive"
      className="border-b border-[color:var(--color-gold-20)] bg-background px-[clamp(20px,6vw,80px)] py-[clamp(64px,8vw,112px)]"
    >
      <header className="mb-[clamp(24px,3vw,40px)] flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-end gap-[clamp(16px,3vw,40px)]">
          <BigNum>04</BigNum>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
              ◆ Recently honored
            </span>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] leading-tight text-[color:var(--color-cream)]">
              Pieces that <em className="italic text-[color:var(--color-gold)]">found a home.</em>
            </h2>
            <p className="max-w-[60ch] font-sans text-[14px] leading-relaxed text-[color:var(--color-cream-80)]">
              A running record of timepieces placed through The Watch Alley.
              If you missed one, message us. Similar references come around.
            </p>
          </div>
        </div>
        <Link
          href="/sold"
          className="self-end border-b border-[color:var(--color-gold-30)] pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-80)] transition-colors hover:border-[color:var(--color-gold)] hover:text-[color:var(--color-gold)]"
        >
          View full archive →
        </Link>
      </header>

      <div className="flex flex-col">
        {watches.map((watch) => (
          <SoldRow key={watch.id} watch={watch} />
        ))}
      </div>
    </section>
  );
}
