/**
 * Watchmaker's-bench caliper overlay for the hero featured card.
 *
 * Editorial replacement for the "tactical HUD targeting" aesthetic - same
 * mechanical-animated energy, but the vocabulary is bench instruments
 * (calipers, dimension readouts) instead of military crosshairs.
 *
 * Pure SVG + inline CSS keyframes. No JS, no IO observer needed - the
 * animation fires on initial paint with a short delay so it reads as
 * "instrument calibrating" the moment the page lands.
 *
 * Parent must be `position: relative`. Overlay fills + ignores pointer.
 * Honors prefers-reduced-motion.
 */
interface CaliperOverlayProps {
  /** Top dimension readout - e.g. "Ø 39.5 MM" or "39.5 MM CASE". */
  topLabel: string;
  /** Bottom dimension readout - e.g. "47.5 MM LUG-TO-LUG". */
  bottomLabel: string;
}

export function CaliperOverlay({ topLabel, bottomLabel }: CaliperOverlayProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes wa-cal-draw   { from { transform: scaleX(0); }   to { transform: scaleX(1); } }
        @keyframes wa-cal-rise   { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wa-cal-tick   { from { transform: scaleY(0); }   to { transform: scaleY(1); } }
        @keyframes wa-cal-rail   { from { transform: scaleY(0); }   to { transform: scaleY(1); } }
        @keyframes wa-cal-pulse  { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.85; } }

        .wa-cal {
          --wa-cal-ease: cubic-bezier(0.22, 1, 0.36, 1);
        }
        .wa-cal__rule {
          transform-origin: center;
          transform: scaleX(0);
          animation: wa-cal-draw 1.2s var(--wa-cal-ease) forwards;
          animation-delay: 600ms;
        }
        .wa-cal__rule--bottom { animation-delay: 800ms; }
        .wa-cal__tick {
          transform-origin: center;
          transform: scaleY(0);
          animation: wa-cal-tick 0.45s var(--wa-cal-ease) forwards;
          animation-delay: 1500ms;
        }
        .wa-cal__rail {
          transform-origin: center;
          transform: scaleY(0);
          animation: wa-cal-rail 1.0s var(--wa-cal-ease) forwards;
          animation-delay: 1000ms;
        }
        .wa-cal__label {
          opacity: 0;
          animation: wa-cal-rise 0.9s var(--wa-cal-ease) forwards;
          animation-delay: 1600ms;
        }
        .wa-cal__label--bottom { animation-delay: 1800ms; }
        .wa-cal__pulse {
          animation: wa-cal-pulse 3.6s ease-in-out infinite;
          animation-delay: 2400ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .wa-cal__rule, .wa-cal__tick, .wa-cal__rail, .wa-cal__label, .wa-cal__pulse {
            transform: none !important;
            opacity: 1 !important;
            animation: none !important;
          }
        }
      `}</style>

      <div className="wa-cal absolute inset-0">
        {/* Top caliper rule - extends across the card */}
        <div className="absolute left-3 right-3 top-1.5">
          <div
            className="wa-cal__rule h-px w-full bg-[color:var(--color-gold)]"
            style={{ opacity: 0.5 }}
          />
          {/* Tick marks at each end (the caliper jaws) */}
          <span
            className="wa-cal__tick absolute -top-1 left-0 block h-2 w-px bg-[color:var(--color-gold)]"
            style={{ opacity: 0.7 }}
          />
          <span
            className="wa-cal__tick absolute -top-1 right-0 block h-2 w-px bg-[color:var(--color-gold)]"
            style={{ opacity: 0.7 }}
          />
          {/* Centered mono label sits BELOW the rule */}
          <span className="wa-cal__label wa-cal__pulse absolute left-1/2 top-1.5 -translate-x-1/2 whitespace-nowrap bg-[color:var(--color-card)] px-2 font-mono text-[9px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
            {topLabel}
          </span>
        </div>

        {/* Bottom caliper rule */}
        <div className="absolute bottom-1.5 left-3 right-3">
          <div
            className="wa-cal__rule wa-cal__rule--bottom h-px w-full bg-[color:var(--color-gold)]"
            style={{ opacity: 0.5 }}
          />
          <span
            className="wa-cal__tick absolute -bottom-1 left-0 block h-2 w-px bg-[color:var(--color-gold)]"
            style={{ opacity: 0.7 }}
          />
          <span
            className="wa-cal__tick absolute -bottom-1 right-0 block h-2 w-px bg-[color:var(--color-gold)]"
            style={{ opacity: 0.7 }}
          />
          <span className="wa-cal__label wa-cal__label--bottom absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[color:var(--color-card)] px-2 font-mono text-[9px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
            {bottomLabel}
          </span>
        </div>

        {/* Vertical rail on the left edge - instrument body */}
        <div className="absolute bottom-6 left-1.5 top-6">
          <div
            className="wa-cal__rail h-full w-px bg-[color:var(--color-gold)]"
            style={{ opacity: 0.35 }}
          />
        </div>
        {/* Mirrored rail on the right edge - closes the instrument frame */}
        <div className="absolute bottom-6 right-1.5 top-6">
          <div
            className="wa-cal__rail h-full w-px bg-[color:var(--color-gold)]"
            style={{ opacity: 0.35 }}
          />
        </div>
      </div>
    </div>
  );
}
