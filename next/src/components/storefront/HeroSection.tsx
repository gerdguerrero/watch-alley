import type { Watch } from "@/lib/inventory/types";
import { formatPhp } from "@/lib/inventory/format";

interface HeroSectionProps {
  featured: Watch | null;
}

/**
 * Editorial hero. Headline + body on the left, featured watch card on the right.
 *
 * Server Component — the featured watch is read once on the server and rendered
 * into the HTML. No loading state on first paint.
 */
export function HeroSection({ featured }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-border bg-background px-[clamp(20px,6vw,80px)] py-[clamp(64px,10vw,120px)]"
    >
      <div className="relative z-10 grid items-center gap-[clamp(32px,5vw,72px)] lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-5">
            <span className="inline-block border border-[color:var(--color-gold-20)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
              ◉ ISSUE Nº 47 · APRIL 2026
            </span>
          </div>
          <h1 className="font-serif text-[clamp(48px,8vw,96px)] leading-[1.02] text-[color:var(--color-cream)]">
            Honest watches,
            <br />
            <em className="italic text-[color:var(--color-gold)]">honestly</em> sold.
          </h1>
          <p className="mt-6 max-w-[60ch] font-sans text-[clamp(15px,1.4vw,18px)] leading-[1.65] text-[color:var(--color-cream-80)]">
            Pre-owned and brand-new timepieces curated in Manila. Seiko. Omega.
            Hamilton. Tissot. Every piece photographed in daylight, disclaimed
            where it counts, and shipped worldwide.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a
              href="/available"
              className="inline-flex items-center gap-2 border border-[color:var(--color-gold)] bg-[color:var(--color-gold)] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-navy-deep)] transition-opacity hover:opacity-85"
            >
              Shop Available ↗
            </a>
            <a
              href="/#viber"
              className="border-b border-[color:var(--color-gold-30)] pb-0.5 font-sans text-sm italic text-[color:var(--color-cream-80)] transition-colors hover:border-[color:var(--color-gold)] hover:text-[color:var(--color-gold)]"
            >
              or join the Viber community →
            </a>
          </div>
        </div>

        {featured && <HeroFeaturedCard watch={featured} />}
      </div>
    </section>
  );
}

function HeroFeaturedCard({ watch }: { watch: Watch }) {
  return (
    <aside className="w-full justify-self-end border border-[color:var(--color-gold-20)] bg-[color:var(--color-card)] p-7 lg:max-w-[420px]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
            FEATURED · AVAILABLE NOW
          </div>
          <div className="mt-2 font-serif text-2xl leading-tight text-[color:var(--color-cream)]">
            {watch.brand}
            <br />
            <span className="italic">{watch.name}</span>
          </div>
        </div>
        <span className="text-2xl leading-none text-[color:var(--color-gold)]">●</span>
      </header>
      <div className="my-5 h-px bg-[color:var(--color-gold-20)]" />
      <dl className="grid grid-cols-2 gap-y-4 text-sm text-[color:var(--color-cream-80)]">
        {watch.edition && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Edition
            </dt>
            <dd className="mt-1 font-sans">{watch.edition}</dd>
          </div>
        )}
        {watch.caseSize && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Case
            </dt>
            <dd className="mt-1 font-sans">{watch.caseSize}</dd>
          </div>
        )}
        {watch.movement && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Movement
            </dt>
            <dd className="mt-1 font-sans">{watch.movement}</dd>
          </div>
        )}
        {watch.conditionLabel && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Condition
            </dt>
            <dd className="mt-1 font-sans">{watch.conditionLabel}</dd>
          </div>
        )}
      </dl>
      <div className="my-5 h-px bg-[color:var(--color-gold-20)]" />
      <footer className="flex items-center justify-between">
        <span className="font-serif text-2xl text-[color:var(--color-gold)]">
          {formatPhp(watch.price)}
          <span
            className="mt-0.5 block font-mono text-[11px] font-normal not-italic tracking-[0.2em] text-[color:var(--color-cream-60)]"
            data-price-php={watch.price}
          />
        </span>
        <a
          href={`/watch/${watch.slug}`}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]"
        >
          INQUIRE →
        </a>
      </footer>
    </aside>
  );
}
