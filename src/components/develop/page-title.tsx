import type { ReactNode } from "react";

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
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-amber-500">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
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
    <div className="relative pt-[clamp(120px,16vh,180px)] pb-12 md:pb-20 px-6 md:px-12 lg:px-20">
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
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)",
        }}
      />

      <h1
        className="wa-page-rise relative z-0 text-center text-[15vw] md:text-[12vw] font-light tracking-tight leading-none select-none mb-8 md:mb-12"
        style={{
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
            className="wa-page-rise font-mono text-[10px] tracking-[0.3em] uppercase text-amber-500/80 mb-4"
            style={{ animationDelay: "80ms" }}
          >
            {eyebrow}
          </div>
        )}
        {headline && (
          <h2
            className="wa-page-rise font-serif text-3xl md:text-5xl leading-[1.1] text-zinc-100 mb-6"
            style={{ animationDelay: "160ms" }}
          >
            {renderHeadline(headline)}
          </h2>
        )}
        {description && (
          <p
            className="wa-page-rise text-base md:text-lg text-zinc-400 leading-relaxed max-w-[60ch] mx-auto"
            style={{ animationDelay: "240ms" }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
