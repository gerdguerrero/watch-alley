/**
 * Section-header decoration - oversize italic Playfair numeral that sits to
 * the left of a section's eyebrow + title. Brand signature. Server Component.
 *
 * Mirrors the .big-num element from the Vite-era homepage so section headers
 * carry the same editorial weight.
 */
interface BigNumProps {
  children: string;
  className?: string;
}

export function BigNum({ children, className = "" }: BigNumProps) {
  return (
    <span
      aria-hidden="true"
      className={`select-none font-serif italic text-[color:var(--color-gold)] leading-[0.8] opacity-35 text-[clamp(56px,12vw,180px)] ${className}`}
    >
      {children}
    </span>
  );
}
