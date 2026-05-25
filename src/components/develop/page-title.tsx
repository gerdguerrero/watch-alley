import type { ReactNode } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";

interface PageTitleProps {
  /** Giant gradient word displayed behind/above the eyebrow + headline. */
  title: string;
  /** Small amber uppercase tag above the headline. */
  eyebrow?: string;
  /** Italic-emphasized headline rendered as serif text. Use *...* for amber emphasis. */
  headline?: ReactNode;
  /** Body lede below the headline. */
  description?: ReactNode;
}

function renderHeadline(node: ReactNode) {
  if (typeof node !== "string") return node;
  const parts = node.split(/(\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={part} className="italic text-amber-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={part}>{part}</span>;
  });
}

/**
 * Develop-aesthetic page header: huge gradient title, amber eyebrow, serif headline, lede.
 *
 * Pure Server Component — no client JS, no scroll listeners, no framer-motion
 * hooks. The entrance is a tiny CSS fade so navigation between routes is instant.
 */
export function PageTitle({ title, eyebrow, headline, description }: PageTitleProps) {
  return (
    <div className="relative overflow-hidden px-6 pt-[clamp(120px,16vh,180px)] pb-12 md:px-12 md:pb-20 lg:flex lg:h-[65vh] lg:flex-col lg:justify-center lg:px-20 lg:py-0">
      <style>{`
        @keyframes wa-page-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .wa-page-rise {
          opacity: 0;
          animation: wa-page-rise 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .wa-page-rise { animation: none; opacity: 1; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.07] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundThree})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)",
        }}
      />

      <h1
        className="wa-page-rise relative z-0 mb-8 text-center font-serif font-normal leading-none select-none text-transparent md:mb-12"
        style={{
          fontSize: "clamp(3.5rem, 13vw, 11rem)",
          background:
            "linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {title}
      </h1>

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {eyebrow && (
          <div
            className="wa-page-rise font-mono text-[10px] tracking-[0.3em] uppercase text-amber-300/80 mb-4"
            style={{ animationDelay: "80ms" }}
          >
            {eyebrow}
          </div>
        )}
        {headline && (
          <h2
            className="wa-page-rise font-serif text-3xl md:text-5xl leading-[1.1] text-cream mb-6"
            style={{ animationDelay: "160ms" }}
          >
            {renderHeadline(headline)}
          </h2>
        )}
        {description && (
          <p
            className="wa-page-rise text-base md:text-lg text-cream-60 leading-relaxed max-w-[60ch] mx-auto"
            style={{ animationDelay: "240ms" }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
