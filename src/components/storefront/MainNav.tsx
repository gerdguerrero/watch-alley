import Image from "next/image";
import Link from "next/link";
import { NavScrollMount } from "./NavScrollMount";

interface MainNavProps {
  /** Highlight one of the nav items as active. */
  active?: "available" | "sold" | "journal" | "service";
}

/**
 * Site-wide navigation. Three-column grid that matches the e6419b3 layout
 * AND its scroll-shrink behavior: when the user scrolls past 60px the
 * NavScrollMount client island sets `data-scrolled="true"`, and the inline
 * styles below tighten padding + scale the logo image via transform.
 *
 *   ┌─────────────────────────────┬──────────────────┬────────────────────────────┐
 *   │ AVAILABLE · SOLD ARCHIVE …  │ LOGO + wordmark  │ EN · ₱ PHP   [◆ MESSENGER] │
 *   └─────────────────────────────┴──────────────────┴────────────────────────────┘
 *
 * Server Component. The scroll handler lives in a tiny client island.
 */
export function MainNav({ active }: MainNavProps) {
  const linkBase =
    "relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap pb-0.5 text-[12px] uppercase tracking-[0.18em] text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]";
  const activeClass =
    "text-[color:var(--color-gold)] after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[color:var(--color-gold)]";

  return (
    <nav
      id="main-nav"
      data-scrolled="false"
      className="wa-main-nav sticky top-0 z-50 flex flex-col items-center border-b border-[color:var(--color-gold-20)] px-[clamp(20px,6vw,80px)] py-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:py-[22px]"
      style={{
        background: "rgba(7,11,20,0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <style>{`
        .wa-main-nav { transition: padding-top 0.35s cubic-bezier(0.22, 1, 0.36, 1), padding-bottom 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        .wa-main-nav[data-scrolled="true"] { padding-top: 13px; padding-bottom: 13px; }
        .wa-main-nav .wa-logo-img { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); transform-origin: center; }
        .wa-main-nav[data-scrolled="true"] .wa-logo-img { transform: scale(0.68); }
        .wa-main-nav .wa-logo-wrap { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); transform-origin: center; }
        .wa-main-nav[data-scrolled="true"] .wa-logo-wrap { transform: scale(0.92); }
      `}</style>

      {/* Left: section links */}
      <div className="order-2 mt-3 flex w-full min-w-0 gap-5 overflow-x-auto pb-1 [scrollbar-width:none] md:order-none md:mt-0 md:w-auto md:justify-start md:gap-8 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        <Link
          href="/available"
          className={`${linkBase} ${active === "available" ? activeClass : ""}`}
        >
          Available
        </Link>
        <Link href="/sold" className={`${linkBase} ${active === "sold" ? activeClass : ""}`}>
          Sold Archive
        </Link>
        <Link href="/journal" className={`${linkBase} ${active === "journal" ? activeClass : ""}`}>
          Journal
        </Link>
        <Link href="/#contact" className={`${linkBase} ${active === "service" ? activeClass : ""}`}>
          Service
        </Link>
      </div>

      {/* Center: logo + wordmark */}
      <Link
        href="/"
        aria-label="The Watch Alley home"
        className="wa-logo-wrap order-1 flex min-w-0 items-center justify-center gap-3 md:order-none"
      >
        <Image
          src="/brand/logo-dp-flat.png"
          alt=""
          width={50}
          height={50}
          className="wa-logo-img object-contain"
          priority
        />
        <span className="font-serif text-sm tracking-[0.1em] text-[color:var(--color-cream)]">
          The Watch Alley
        </span>
      </Link>

      {/* Right: locale + Messenger pill (desktop only) */}
      <div className="hidden items-center justify-end gap-5 md:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
          EN · ₱ PHP
        </span>
        <a
          href="https://m.me/TheWatchAlley"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[color:var(--color-gold)] bg-[color:var(--color-gold)] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-navy-deep)] transition-opacity hover:opacity-85"
        >
          ◆ Messenger
        </a>
      </div>

      <NavScrollMount />
    </nav>
  );
}
