import Image from "next/image";
import { CaliperOverlay } from "@/components/storefront/CaliperOverlay";
import { FilmGrain } from "@/components/storefront/FilmGrain";
import { SplitHeadline } from "@/components/storefront/SplitHeadline";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";

interface HeroSectionProps {
  featured: Watch | null;
}

/**
 * Editorial hero - matches the e6419b3 visual: 100dvh height with a min of
 * 600px, video bg cropped to the right so the dial sits over the featured
 * card column, heavy walnut L→R gradient curtain on the left so the
 * headline reads, asymmetric top/bottom padding so the body sits about
 * a third down the section.
 *
 * Server Component. The video plays itself via autoplay/muted/loop/playsinline;
 * the poster fills the same slot for motion-reduce users.
 */
export function HeroSection({ featured }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative min-h-[calc(100svh-94px)] overflow-hidden border-b border-[color:var(--color-gold-20)]"
      style={{ background: "#070b14" }}
    >
      {/* Background media - poster + looping video, both cropped right. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Image
          src="/hero-poster.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_center] md:object-[center_right]"
        />
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-[115%] w-full object-cover object-[center_center] motion-reduce:hidden md:object-[center_right]"
        >
          <source src="/hero-bg.webm" type="video/webm" />
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* L→R curtain - heavy walnut on the left, fading over the dial on the right. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(7,11,20,0.88) 0%, rgba(7,11,20,0.75) 30%, rgba(7,11,20,0.35) 55%, rgba(7,11,20,0.05) 75%, rgba(7,11,20,0.10) 100%)",
          }}
        />
        {/* T→B vignette + bottom fade into the next section. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,11,20,0.35) 0%, rgba(7,11,20,0.05) 20%, rgba(7,11,20,0.05) 65%, rgba(7,11,20,0.55) 100%)",
          }}
        />
        {/* Film grain - lifts the video from digital playback to magazine spread. */}
        <FilmGrain opacity={0.06} />
      </div>

      <div className="relative z-10 grid min-h-[calc(100svh-94px)] items-center gap-[clamp(24px,4vw,40px)] px-[clamp(20px,6vw,80px)] pb-[clamp(60px,8vw,100px)] pt-[clamp(32px,5vw,72px)] lg:grid-cols-[1.1fr_1fr]">
        <div>
          <style>{`
            @keyframes wa-hero-rise {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .wa-hero-rise {
              opacity: 0;
              transform: translateY(10px);
              animation: wa-hero-rise 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }
            #hero h1 { font-size: clamp(36px, min(7.5vw, 13vh), 88px); line-height: 0.98; letter-spacing: -0.02em; }
            @media (prefers-reduced-motion: reduce) {
              .wa-hero-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
            }
          `}</style>
          <SplitHeadline
            phrases={["Honest watches,", "*honestly* sold."]}
            className="font-serif font-normal text-[color:var(--color-cream)]"
            duration={1400}
            initialDelay={350}
          />
          <p
            className="wa-hero-rise mt-6 max-w-[540px] font-sans text-[clamp(14px,1.3vw,18px)] leading-[1.55] text-[color:var(--color-cream-80)]"
            style={{ animationDelay: "1700ms" }}
          >
            Pre-owned and brand-new timepieces curated in Manila. Seiko. Omega. Hamilton. Tissot.
            Every piece photographed in daylight, disclaimed where it counts, and shipped worldwide.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <a
              href="/available"
              className="wa-hero-rise inline-flex items-center gap-2 border border-[color:var(--color-gold)] bg-[color:var(--color-gold)] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-navy-deep)] transition-opacity hover:opacity-85"
              style={{ animationDelay: "1950ms" }}
            >
              Shop Available ↗
            </a>
            <a
              href="/#messenger"
              className="wa-hero-rise font-sans text-sm italic text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]"
              style={{ animationDelay: "2100ms" }}
            >
              or message us on Messenger →
            </a>
          </div>
        </div>

        {featured && <HeroFeaturedCard watch={featured} />}
      </div>
    </section>
  );
}

/**
 * Glassmorphic featured card - the one place in the project where backdrop
 * blur is allowed (per DESIGN.md): it sits over the hero video, so the
 * glass effect renders against real motion and earns its weight.
 */
function HeroFeaturedCard({ watch }: { watch: Watch }) {
  // Caliper labels - prefer real case + edition data, fall back to generic
  // bench language so the overlay never reads as a missing field.
  const topLabel = watch.caseSize ? `Ø ${watch.caseSize.replace(/\s+/g, " ")}` : "ON THE BENCH";
  const bottomLabel = watch.movement
    ? `${watch.movement.split(/\s+/).slice(0, 3).join(" ").toUpperCase()}`
    : "VERIFIED · IN PERSON";

  return (
    <aside
      className="wa-hero-rise relative w-full justify-self-end border border-[color:var(--color-gold-20)] p-7 lg:max-w-[420px]"
      style={{
        background: "rgba(7,11,20,0.55)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        animationDelay: "400ms",
        animationDuration: "1.2s",
      }}
    >
      <style>{`
        @keyframes wa-card-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wa-card-divider {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .wa-hcard-rise {
          opacity: 0;
          transform: translateY(8px);
          animation: wa-card-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .wa-hcard-divider {
          transform-origin: left center;
          transform: scaleX(0);
          animation: wa-card-divider 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .wa-hcard-rise, .wa-hcard-divider { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <CaliperOverlay topLabel={topLabel} bottomLabel={bottomLabel} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <div
            className="wa-hcard-rise font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]"
            style={{ animationDelay: "1900ms" }}
          >
            FEATURED · AVAILABLE NOW
          </div>
          <div
            className="wa-hcard-rise mt-2 font-serif text-2xl leading-tight text-[color:var(--color-cream)]"
            style={{ animationDelay: "2050ms" }}
          >
            {watch.brand}
            <br />
            <span className="italic">{watch.name}</span>
          </div>
        </div>
        <span
          className="wa-hcard-rise text-2xl leading-none text-[color:var(--color-gold)]"
          style={{ animationDelay: "2200ms" }}
        >
          ●
        </span>
      </header>
      <div
        className="wa-hcard-divider my-5 h-px bg-[color:var(--color-gold-20)]"
        style={{ animationDelay: "2350ms" }}
      />
      <dl className="grid grid-cols-2 gap-y-4 text-sm text-[color:var(--color-cream-80)]">
        {watch.edition && (
          <div className="wa-hcard-rise" style={{ animationDelay: "2450ms" }}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Edition
            </dt>
            <dd className="mt-1 font-sans">{watch.edition}</dd>
          </div>
        )}
        {watch.caseSize && (
          <div className="wa-hcard-rise" style={{ animationDelay: "2550ms" }}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Case
            </dt>
            <dd className="mt-1 font-sans">{watch.caseSize}</dd>
          </div>
        )}
        {watch.movement && (
          <div className="wa-hcard-rise" style={{ animationDelay: "2650ms" }}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Movement
            </dt>
            <dd className="mt-1 font-sans">{watch.movement}</dd>
          </div>
        )}
        {watch.conditionLabel && (
          <div className="wa-hcard-rise" style={{ animationDelay: "2750ms" }}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
              Condition
            </dt>
            <dd className="mt-1 font-sans">{watch.conditionLabel}</dd>
          </div>
        )}
      </dl>
      <div
        className="wa-hcard-divider my-5 h-px bg-[color:var(--color-gold-20)]"
        style={{ animationDelay: "2900ms" }}
      />
      <footer className="flex items-center justify-between">
        <span
          className="wa-hcard-rise font-serif text-2xl text-[color:var(--color-gold)]"
          style={{ animationDelay: "3000ms" }}
        >
          {formatPhp(watch.price)}
          <span
            className="mt-0.5 block font-mono text-[11px] font-normal not-italic tracking-[0.2em] text-[color:var(--color-cream-60)]"
            data-price-php={watch.price}
          />
        </span>
        <a
          href={`/watch/${watch.slug}`}
          style={{ animationDelay: "3150ms" }}
          className="wa-hcard-rise font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]"
        >
          INQUIRE →
        </a>
      </footer>
    </aside>
  );
}
