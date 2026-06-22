/**
 * Curator signoff. Editorial italic treatment with a small gold flourish
 * stroke beneath - reads as a handwritten signature without needing a
 * separate script font load.
 *
 * Server Component.
 */
export function CuratorSignature() {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="font-serif text-[clamp(24px,2.6vw,32px)] italic leading-none text-[color:var(--color-gold)]">
        Buloy
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 120 8"
        className="h-[8px] w-[clamp(80px,8vw,120px)] text-[color:var(--color-gold)]"
      >
        {/* A single hand-drawn flourish - slight bow + tail, the kind of
            line you'd see under an editor's letter signoff. */}
        <path
          d="M 2 4 C 24 8, 60 1, 100 4 C 108 5, 116 7, 118 4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </svg>
      <span className="font-sans text-[13px] italic text-[color:var(--color-cream-60)]">
        on the bench, Manila
      </span>
    </div>
  );
}
