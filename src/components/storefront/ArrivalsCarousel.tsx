import type { Watch } from "@/lib/inventory/types";
import { ArrivalsCarouselControls } from "./ArrivalsCarouselControls";
import { BigNum } from "./BigNum";
import { CarouselDragMount } from "./CarouselDragMount";
import { WatchCard } from "./WatchCard";

interface ArrivalsCarouselProps {
  watches: Watch[];
}

/**
 * Horizontal-scrolling carousel for the homepage "Fresh off the bench" section.
 *
 * Server Component. Scroll snap carries swipe behavior without JS; the small
 * controls island only wires the previous/next buttons.
 */
export function ArrivalsCarousel({ watches }: ArrivalsCarouselProps) {
  const trackId = "arrivals-track";

  if (watches.length === 0) {
    return (
      <section className="border-t border-border bg-background px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,96px)]">
        <ArrivalsHeader />
        <p className="mt-8 max-w-[60ch] font-sans text-[color:var(--color-cream-60)]">
          No active listings right now. The next drop is queued. Message us on Messenger to be first
          in line.
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
        <ArrivalsCarouselControls targetId={trackId} />
      </div>

      <section
        id={trackId}
        className="flex snap-x snap-mandatory items-stretch gap-6 overflow-x-auto pb-4 [scrollbar-width:thin]"
        aria-label="Available watches"
      >
        {watches.map((watch) => (
          <div key={watch.slug} className="flex snap-start">
            <WatchCard watch={watch} />
          </div>
        ))}
      </section>
      <CarouselDragMount targetId={trackId} />
    </section>
  );
}

/**
 * Hoisted out of the main component to keep the JSX tree shallow and to make
 * it obvious this header is pure-static (see `rendering-hoist-jsx`).
 */
function ArrivalsHeader() {
  return (
    <div className="flex items-end gap-[clamp(16px,3vw,40px)]">
      <BigNum>03</BigNum>
      <div className="flex flex-col gap-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
          THIS WEEK · NEW IN
        </div>
        <h2 className="font-serif text-[clamp(32px,5vw,56px)] leading-tight text-[color:var(--color-cream)]">
          Fresh <em className="italic text-[color:var(--color-gold)]">off the bench.</em>
        </h2>
      </div>
    </div>
  );
}
