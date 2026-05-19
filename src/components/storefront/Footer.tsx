import Image from "next/image";
import Link from "next/link";
import { BenchTime } from "./BenchTime";

/**
 * Site footer. Logo + copyright + legal links + live Manila bench-time.
 *
 * Editorial register: thin gold rule on top, generous spacing, mono labels.
 * The bench-time line is the premium operator detail — a quietly ticking
 * timestamp ("we know what time it actually is, here, on the bench").
 * Server Component shell; the time itself is a tiny client island.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col gap-6 border-t border-[color:var(--color-gold-20)] bg-background px-[clamp(20px,6vw,80px)] py-[clamp(32px,4vw,48px)]">
      <div className="grid grid-cols-1 items-center gap-6 text-center md:grid-cols-3 md:text-left">
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-self-center text-inherit md:justify-self-start"
          aria-label="The Watch Alley — home"
        >
          <Image
            src="/logo.jpg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="font-serif text-[13px] font-medium text-[color:var(--color-cream)]">
            The Watch Alley
          </span>
        </Link>

        <span className="justify-self-center font-sans text-[13px] italic leading-snug text-[color:var(--color-cream-60)]">
          © {year} The Watch Alley PH, Manila.
        </span>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-6 md:justify-end"
        >
          <a
            href="/privacy.html"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] transition-colors hover:text-[color:var(--color-gold)]"
          >
            Privacy
          </a>
          <a
            href="/terms.html"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] transition-colors hover:text-[color:var(--color-gold)]"
          >
            Terms
          </a>
          <a
            href="/authenticity.html"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] transition-colors hover:text-[color:var(--color-gold)]"
          >
            Authenticity
          </a>
        </nav>
      </div>

      <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-[color:var(--color-gold-20)] pt-6 md:flex-row md:gap-6">
        <span className="font-sans text-[12px] italic text-[color:var(--color-cream-60)]">
          Built with care in Manila.
        </span>
        <BenchTime />
      </div>
    </footer>
  );
}
