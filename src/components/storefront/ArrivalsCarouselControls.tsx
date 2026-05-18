"use client";

import { useCallback } from "react";

interface ArrivalsCarouselControlsProps {
  targetId: string;
}

export function ArrivalsCarouselControls({ targetId }: ArrivalsCarouselControlsProps) {
  const scrollByCard = useCallback(
    (direction: 1 | -1) => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const card = el.querySelector<HTMLElement>("[data-watch-slug]");
      const cardWidth = card?.offsetWidth ?? 320;
      const gap = 24;
      el.scrollBy({ left: direction * (cardWidth + gap), behavior: "smooth" });
    },
    [targetId]
  );

  return (
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
  );
}
