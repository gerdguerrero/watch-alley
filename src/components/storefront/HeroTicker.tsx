/**
 * Editorial ticker — slow marquee under the hero. Trust micro-copy that
 * never asks for a click. Pauses on hover, frozen for motion-reduce users.
 *
 * Pure CSS animation via inline <style>. No client JS needed. The track
 * is doubled so the loop is seamless.
 *
 * Server Component.
 */
const ITEMS = [
  "Authenticated, in person",
  "Disclosed in writing",
  "Daylight-photographed",
  "Reply within four hours, Mon to Sat",
  "Shipped insured, worldwide",
  "BGC, Taguig · by appointment",
  "Curated since 2019",
];

export function HeroTicker() {
  // Double the list so the keyframe -50% loop is seamless.
  const doubled = [
    ...ITEMS.map((item) => ({ id: `first-${item}`, label: item })),
    ...ITEMS.map((item) => ({ id: `second-${item}`, label: item })),
  ];

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-t border-b border-[color:var(--color-gold-20)] bg-background py-3"
    >
      <style>{`
        @keyframes wa-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .wa-ticker-track { animation: wa-ticker 60s linear infinite; }
        .wa-ticker-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .wa-ticker-track { animation: none; } }
      `}</style>
      <div className="wa-ticker-track flex w-max gap-12 whitespace-nowrap will-change-transform">
        {doubled.map((item) => (
          <span
            key={item.id}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]"
          >
            ✦ {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
