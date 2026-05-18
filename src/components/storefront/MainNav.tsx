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
    "relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap pb-0.5 text-[12px] uppercase tracking-[0.18em] text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]";
  const activeClass =
    "text-[color:var(--color-gold)] after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[color:var(--color-gold)]";
  return (
    <nav className="sticky top-0 z-50 flex flex-col items-center border-b border-border bg-background/95 px-[clamp(20px,6vw,80px)] py-4 backdrop-blur-[14px] md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:py-[22px]">
      <div className="order-2 mt-3 flex w-full min-w-0 gap-5 overflow-x-auto pb-1 [scrollbar-width:none] md:order-none md:mt-0 md:w-auto md:gap-8 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        <Link
          href="/available"
          className={`${linkBase} ${active === "available" ? activeClass : ""}`}
        >
          Available
        </Link>
        <Link href="/journal" className={`${linkBase} ${active === "journal" ? activeClass : ""}`}>
          Journal
        </Link>
        <Link href="/sold" className={`${linkBase} ${active === "sold" ? activeClass : ""}`}>
          Sold Archive
        </Link>
        <Link href="/#contact" className={`${linkBase} ${active === "visit" ? activeClass : ""}`}>
          Visit
        </Link>
      </div>
      <Link
        href="/"
        aria-label="The Watch Alley — home"
        className="order-1 flex min-w-0 items-center justify-center gap-3 md:order-none"
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
      <div className="hidden md:block" />
    </nav>
  );
}
