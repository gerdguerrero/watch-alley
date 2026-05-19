/**
 * Slim 3-span ledger strip above the nav. Matches the e6419b3 layout:
 * stock count on the left, location in the center, IG handle on the right.
 *
 * Mobile: only the center span renders (left/right hide via Tailwind).
 * Server Component.
 */
export function TopBar() {
  return (
    <div
      className="grid grid-cols-1 items-center border-b border-[color:var(--color-gold-20)] px-[clamp(20px,6vw,80px)] py-2 text-center md:grid-cols-3"
      style={{ background: "#070b14" }}
    >
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)] md:inline md:text-left">
        ✦ 10 Pieces Available
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
        ✦ BGC, Taguig · Manila
      </span>
      <a
        href="https://instagram.com/the.watch.alley"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)] transition-opacity hover:opacity-80 md:inline md:text-right"
      >
        ✦ @the.watch.alley
      </a>
    </div>
  );
}
