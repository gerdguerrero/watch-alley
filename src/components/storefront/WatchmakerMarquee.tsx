"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Editorial broadcasting masthead — replaces a generic horizontal ticker
 * with a single, large, slowly rotating italic Playfair quote in the
 * watchmaker's voice. One quote at a time, ~12s each, cubic fade+blur
 * transition. Pagination dots, live Manila bench-time stamp, and a thin
 * gold rule that scans across the section between quote transitions.
 *
 * Pause-on-hover (premium hospitality move). Honors prefers-reduced-motion.
 * Client island — state + interval + Intl.DateTimeFormat all live here.
 */
const QUOTES: ReadonlyArray<{ text: string; emphasize: string }> = [
  {
    text: "Every watch we list passes through these hands. No exceptions.",
    emphasize: "these hands",
  },
  {
    text: "A serviced piece on your wrist beats a perfect catalog photograph.",
    emphasize: "serviced",
  },
  {
    text: "The best part isn't the watch. It is the conversation that comes with it.",
    emphasize: "conversation",
  },
  {
    text: "We answer Messenger faster than most shops answer the phone.",
    emphasize: "faster",
  },
  {
    text: "Pre-owned, never pre-loved. Each one was lived with on purpose.",
    emphasize: "on purpose",
  },
];

const ROTATION_MS = 12_000;

function renderQuote(text: string, emphasize: string) {
  // Split the text around the emphasized phrase and gold-italicize it.
  const idx = text.indexOf(emphasize);
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const after = text.slice(idx + emphasize.length);
  return (
    <>
      {before}
      <em className="italic text-[color:var(--color-gold)] not-italic">
        <span className="italic">{emphasize}</span>
      </em>
      {after}
    </>
  );
}

export function WatchmakerMarquee() {
  const [index, setIndex] = useState(0);
  const [benchTime, setBenchTime] = useState("");
  const [paused, setPaused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useRef(false);

  // Live bench-time stamp — updates once per minute, Asia/Manila.
  useEffect(() => {
    function tick() {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setBenchTime(fmt.format(now));
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-rotate quotes. Pause on hover. Skip when reduced-motion or off-viewport.
  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion.current) return;

    let visible = false;
    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
      },
      { threshold: 0.25 }
    );
    if (wrapRef.current) io.observe(wrapRef.current);

    const interval = setInterval(() => {
      if (paused || !visible) return;
      setIndex((i) => (i + 1) % QUOTES.length);
    }, ROTATION_MS);

    return () => {
      clearInterval(interval);
      io.disconnect();
    };
  }, [paused]);

  const goTo = useCallback((i: number) => {
    setIndex(i % QUOTES.length);
  }, []);

  const quote = QUOTES[index];

  return (
    <section
      ref={wrapRef}
      aria-label="Notes from the bench"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative overflow-hidden border-t border-b border-[color:var(--color-gold-20)] bg-background py-[clamp(48px,7vw,96px)]"
    >
      <style>{`
        @keyframes wa-mark-scan {
          0%   { transform: scaleX(0); transform-origin: left center; opacity: 0.0; }
          15%  { transform: scaleX(1); transform-origin: left center; opacity: 0.9; }
          16%  { transform: scaleX(1); transform-origin: right center; }
          100% { transform: scaleX(0); transform-origin: right center; opacity: 0.0; }
        }
        @keyframes wa-mark-fade {
          from { opacity: 0; filter: blur(6px); transform: translateY(8px); }
          to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
        }
        @keyframes wa-mark-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.3); }
        }
        .wa-mark__quote   { animation: wa-mark-fade 1.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .wa-mark__scan    { animation: wa-mark-scan 1.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .wa-mark__pulse   { animation: wa-mark-pulse 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .wa-mark__quote, .wa-mark__scan, .wa-mark__pulse {
            animation: none !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Top + bottom hairlines anchored INSIDE the section padding so they
          read as section frame, not just borders. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[clamp(20px,6vw,80px)] right-[clamp(20px,6vw,80px)] top-[clamp(12px,1.5vw,20px)] h-px bg-[color:var(--color-gold-20)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[clamp(20px,6vw,80px)] right-[clamp(20px,6vw,80px)] bottom-[clamp(12px,1.5vw,20px)] h-px bg-[color:var(--color-gold-20)]"
      />

      {/* Scan rule that sweeps across between transitions. Keyed on index so
          it re-mounts and re-animates every time the quote changes. */}
      <div
        key={`scan-${index}`}
        aria-hidden="true"
        className="wa-mark__scan pointer-events-none absolute left-[clamp(20px,6vw,80px)] right-[clamp(20px,6vw,80px)] top-1/2 h-px bg-[color:var(--color-gold)]"
        style={{ opacity: 0.7 }}
      />

      <div className="relative grid gap-[clamp(20px,3vw,40px)] px-[clamp(20px,6vw,80px)]">
        {/* Top row — eyebrow + live bench stamp */}
        <header className="flex items-center justify-between gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-cream-60)]">
            Notes from the bench
          </span>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-cream-60)]">
            <span
              aria-hidden="true"
              className="wa-mark__pulse inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-gold)]"
            />
            <span>Bench {benchTime || "—"} · Manila · Open</span>
          </span>
        </header>

        {/* The quote — keyed on index so React re-mounts the element and the
            fade keyframe replays every time the quote rotates. */}
        <blockquote
          key={`quote-${index}`}
          className="wa-mark__quote mx-auto max-w-[28ch] text-center font-serif text-[clamp(28px,5vw,56px)] italic leading-[1.1] text-[color:var(--color-cream)] sm:max-w-[40ch]"
        >
          &ldquo;{renderQuote(quote.text, quote.emphasize)}&rdquo;
        </blockquote>

        {/* Bottom row — pagination dots + quote counter */}
        <footer className="flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-2.5"
            role="tablist"
            aria-label="Choose a bench note"
          >
            {QUOTES.map((benchQuote, i) => (
              <button
                key={benchQuote.text}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Bench note ${i + 1} of ${QUOTES.length}`}
                onClick={() => goTo(i)}
                className={`h-1.5 w-1.5 rounded-full border border-[color:var(--color-gold-30)] transition-colors hover:bg-[color:var(--color-gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)] ${
                  i === index ? "bg-[color:var(--color-gold)]" : "bg-transparent"
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-cream-60)] [font-variant-numeric:tabular-nums]">
            Entry {String(index + 1).padStart(2, "0")} / {String(QUOTES.length).padStart(2, "0")}
          </span>
        </footer>
      </div>
    </section>
  );
}
