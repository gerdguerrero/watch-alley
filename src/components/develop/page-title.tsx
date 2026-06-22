import type { ReactNode } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { BrandLogo } from "./brand-logo";

type PageTitleVariant = "hero" | "catalog" | "editorial";

interface PageTitleProps {
  title?: string;
  showHorologicalLogo?: boolean;
  eyebrow?: string;
  headline?: ReactNode;
  description?: ReactNode;
  /**
   * - "hero" (default): Full cinematic hero - homepage.
   * - "catalog": Compact - first product row visible on desktop. Available / Sold.
   * - "editorial": Capped cinematic - Journal.
   */
  variant?: PageTitleVariant;
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

const TITLE_FONT_SIZE: Record<PageTitleVariant, string> = {
  hero: "clamp(3.5rem, 13vw, 11rem)",
  catalog: "clamp(3rem, 10vw, 8.5rem)",
  editorial: "clamp(3.25rem, 11vw, 9.5rem)",
};

/**
 * Develop-aesthetic page header with three height variants:
 * - hero: lg:h-[68vh] - full cinematic for homepage
 * - catalog: lg min-height clamp(360px,46svh,560px) - compact for Available/Sold
 * - editorial: lg min-height clamp(420px,52svh,640px) - capped for Journal
 */
export function PageTitle({
  title,
  showHorologicalLogo = false,
  eyebrow,
  headline,
  description,
  variant = "hero",
}: PageTitleProps) {
  const showDescription = variant !== "catalog" && !!description;

  return (
    <div
      className={`relative overflow-hidden px-6 ${
        variant === "catalog"
          ? "pb-6 md:pb-12"
          : variant === "editorial"
            ? "pb-8 md:pb-14"
            : "pb-12 md:pb-20"
      } md:px-12 lg:flex lg:flex-col lg:justify-center lg:px-20 lg:py-0 ${
        showHorologicalLogo
          ? "pt-[clamp(170px,24vh,250px)] lg:pt-36"
          : variant === "catalog"
            ? "pt-[clamp(100px,12vh,150px)] lg:pt-0"
            : variant === "editorial"
              ? "pt-[clamp(110px,14vh,170px)] lg:pt-0"
              : "pt-[clamp(120px,16vh,180px)] lg:pt-0"
      } ${
        variant === "catalog"
          ? "lg:min-h-[clamp(360px,46svh,560px)]"
          : variant === "editorial"
            ? "lg:min-h-[clamp(420px,52svh,640px)]"
            : "lg:h-[68vh]"
      }`}
    >
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

      {showHorologicalLogo ? (
        <div className="wa-page-rise relative z-0 mb-8 flex justify-center md:mb-12">
          <BrandLogo
            variant="horizontal"
            alt="The Watch Alley"
            className="h-[clamp(104px,22vw,180px)] w-[clamp(138px,30vw,240px)]"
            sizes="(min-width: 768px) 240px, 70vw"
            priority
          />
        </div>
      ) : (
        <h1
          className="wa-page-rise relative z-0 mb-8 text-center font-serif font-normal leading-none select-none text-transparent md:mb-12"
          style={{
            fontSize: TITLE_FONT_SIZE[variant],
            background:
              "linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {title}
        </h1>
      )}

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
        {showDescription && description && (
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
