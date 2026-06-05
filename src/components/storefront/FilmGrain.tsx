/**
 * SVG film-grain overlay. Server Component — pure markup, no JS.
 *
 * Drops over a photo to lift it from "stock product shot" to "editorial
 * magazine spread." Layered at low opacity (0.06–0.10 is the editorial
 * sweet spot). Uses feTurbulence for a calm, monochrome noise field —
 * brighter than feFractalNoise, more like fine-grain 35mm than digital
 * static.
 *
 * Parent must be `position: relative`. Grain stretches to fill.
 */
interface FilmGrainProps {
  /** Opacity 0–1. Editorial defaults are 0.04–0.10. */
  opacity?: number;
  /** Optional className override on the wrapper div. */
  className?: string;
}

export function FilmGrain({ opacity = 0.07, className = "" }: FilmGrainProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 mix-blend-overlay ${className}`}
      style={{ opacity }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-full w-full"
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
      >
        <filter id="wa-film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 0 1
                    0 0 0 1 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#wa-film-grain)" />
      </svg>
    </div>
  );
}
