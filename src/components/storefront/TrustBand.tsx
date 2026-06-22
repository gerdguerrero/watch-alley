import { CountUpFigure } from "./CountUpFigure";

/**
 * Trust band - the four-stat ledger row that sits under the hero.
 *
 * Editorial register, not a SaaS hero-metric template: thin gold rules,
 * generous gaps, Playfair figures with oldstyle-nums, mono labels. No cards.
 *
 * Each stat carries a cascading 220ms delay so the figures count up left to
 * right in sequence - quietly telegraphs care, like a master watchmaker
 * winding pieces one at a time. Server Component shell + client CountUpFigure
 * islands per number.
 */
const STATS: ReadonlyArray<{
  target: number;
  suffix: string;
  label: string;
  context?: string;
  decimals?: number;
}> = [
  { target: 100, suffix: "+", label: "Pieces in Stock", context: "in rotation today" },
  { target: 9.7, suffix: "K", label: "IG Followers", context: "@the.watch.alley", decimals: 1 },
  { target: 2019, suffix: "", label: "Est. Since", context: "seven years on the bench" },
  { target: 100, suffix: "%", label: "Authentic", context: "every piece, every time" },
];

export function TrustBand() {
  return (
    <section
      aria-label="The Watch Alley by the numbers"
      className="border-t border-b border-[color:var(--color-gold-20)] bg-background px-[clamp(20px,6vw,80px)] py-[clamp(32px,4vw,52px)]"
    >
      <ul className="grid grid-cols-2 gap-y-10 sm:grid-cols-4 sm:gap-y-0">
        {STATS.map((stat, index) => (
          <li key={stat.label} className="flex flex-col items-start gap-2">
            <CountUpFigure
              target={stat.target}
              suffix={stat.suffix}
              decimals={stat.decimals}
              delay={index * 220}
              className="font-serif text-[clamp(36px,4.5vw,56px)] leading-none text-[color:var(--color-gold)] [font-variant-numeric:oldstyle-nums_tabular-nums]"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
              {stat.label}
            </span>
            {stat.context && (
              <span className="font-sans text-[12px] italic leading-snug text-[color:var(--color-cream-60)]">
                {stat.context}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
