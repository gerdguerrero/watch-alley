"use client";

import { useCallback, useRef } from "react";
import type { Watch } from "@/lib/inventory/types";
import { WatchCard } from "./WatchCard";

interface ArrivalsCarouselProps {
  watches: Watch[];
}

/**
 * Horizontal-scrolling carousel for the homepage "Fresh off the bench" section.
 *
 * Client Component because of the scroll-by-button interactions. The cards
 * inside are Server Components (`WatchCard`) — the `'use client'` boundary is
 * pushed as far down the tree as it can go.
 *
 * `scroll-snap-x` carries the wrist-feel without JS for the swipe case; the
 * buttons just call `scrollBy` for keyboard / mouse users.
 */
export function ArrivalsCarousel({ watches }: ArrivalsCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-watch-slug]");
    const cardWidth = card?.offsetWidth ?? 320;
    const gap = 24;
    el.scrollBy({ left: direction * (cardWidth + gap), behavior: "smooth" });
  }, []);

  if (watches.length === 0) {
    return (
      <section className="border-t border-border bg-background px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,96px)]">
        <ArrivalsHeader />
        <p className="mt-8 max-w-[60ch] font-sans text-[color:var(--color-cream-60)]">
          No active listings right now. The next drop is queued — message us on
          Viber to be first in line.
        </p>
      </section>
    );
  }

  return (
    <section
      id="arrivals"
      className="border-t border-border bg-background px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <ArrivalsHeader />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous watches"
            className="flex h-10 w-10 items-center justify-center border border-[color:var(--color-gold-20)] font-mono text-base text-[color:var(--color-cream-80)] transition-colors hover:border-[color:var(--color-gold)] hover:text-[color:var(--color-gold)]"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Next watches"
            className="flex h-10 w-10 items-center justify-center border border-[color:var(--color-gold-20)] font-mono text-base text-[color:var(--color-cream-80)] transition-colors hover:border-[color:var(--color-gold)] hover:text-[color:var(--color-gold)]"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:thin]"
        role="region"
        aria-label="Available watches"
        tabIndex={0}
      >
        {watches.map((watch) => (
          <div key={watch.slug} className="snap-start">
            <WatchCard watch={watch} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Hoisted out of the main component to keep the JSX tree shallow and to make
 * it obvious this header is pure-static (see `rendering-hoist-jsx`).
 */
function ArrivalsHeader() {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
        THIS WEEK · NEW IN
      </div>
      <h2 className="mt-2 font-serif text-[clamp(32px,5vw,56px)] leading-tight text-[color:var(--color-cream)]">
        Fresh <em className="italic text-[color:var(--color-gold)]">off the bench.</em>
      </h2>
    </div>
  );
}
