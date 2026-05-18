import Image from "next/image";
import Link from "next/link";

interface MainNavProps {
  /** Highlight one of the nav items as active. */
  active?: "available" | "journal" | "sold" | "visit";
}

/**
 * Site-wide navigation. Same markup on every page (storefront + journal + sold +
 * available) so clicking between them never reflows. Server Component.
 *
 * Links use absolute paths so the markup is identical regardless of which page
 * embeds it.
 */
export function MainNav({ active }: MainNavProps) {
  const linkBase =
    "relative pb-0.5 text-[12px] uppercase tracking-[0.18em] text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]";
  const activeClass =
    "text-[color:var(--color-gold)] after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[color:var(--color-gold)]";
  return (
    <nav className="sticky top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background/95 px-[clamp(20px,6vw,80px)] py-[22px] backdrop-blur-[14px]">
      <div className="flex gap-8">
        <Link
          href="/available"
          className={`${linkBase} ${active === "available" ? activeClass : ""}`}
        >
          Available
        </Link>
        <Link
          href="/journal"
          className={`${linkBase} ${active === "journal" ? activeClass : ""}`}
        >
          Journal
        </Link>
        <Link
          href="/sold"
          className={`${linkBase} ${active === "sold" ? activeClass : ""}`}
        >
          Sold Archive
        </Link>
        <Link
          href="/#contact"
          className={`${linkBase} ${active === "visit" ? activeClass : ""}`}
        >
          Visit
        </Link>
      </div>
      <Link
        href="/"
        aria-label="The Watch Alley — home"
        className="flex items-center justify-center gap-3"
      >
        <Image
          src="/logo.jpg"
          alt=""
          width={50}
          height={50}
          className="rounded-full object-cover"
          priority
        />
        <span className="font-serif text-sm tracking-[0.1em] text-[color:var(--color-cream)]">
          The Watch Alley
        </span>
      </Link>
      <div />
    </nav>
  );
}
