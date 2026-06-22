"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { thumbnailUrl } from "@/lib/inventory/image";

/* ------------------------------------------------------------------ */
/*  Cursor‑tracking full‑image zoom                                   */
/*  Hover → image scales 3× and pans to follow the cursor.            */
/*  No lens, no side panel - the entire container becomes the zoom    */
/*  viewport, like Cartier / Hodinkee / high‑end watch retailers.     */
/* ------------------------------------------------------------------ */

function MagnifiedImage({
  images,
  selectedIndex,
  alt,
}: {
  images: string[];
  selectedIndex: number;
  alt: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const selectedSrc = images[selectedIndex] ?? images[0];

  const handleMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  }, []);

  if (!selectedSrc) return null;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={alt}
      onMouseEnter={() => setHover(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(false)}
      className="relative h-full w-full overflow-hidden"
    >
      <Image
        key={selectedSrc}
        src={selectedSrc}
        alt={alt}
        fill
        sizes="(max-width: 360px) calc(100vw - 40px), (max-width: 768px) 320px, (max-width: 1024px) 420px, 460px"
        preload={selectedIndex === 0}
        loading={selectedIndex === 0 ? undefined : "lazy"}
        draggable={false}
        className="absolute left-0 top-0 h-full w-full object-cover object-center transition-transform duration-150 ease-out"
        style={{
          transform: hover ? "scale(3)" : "scale(1)",
          transformOrigin: `${origin.x}% ${origin.y}%`,
          willChange: hover ? "transform" : "auto",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

interface WatchGalleryProps {
  images: string[];
  alt: string;
  badge?: string;
  soldAt?: string;
  isSold?: boolean;
  isReserved?: boolean;
}

export function WatchGallery({
  images,
  alt,
  badge,
  soldAt,
  isSold,
  isReserved,
}: WatchGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) return null;

  const thumbs = images.slice(0, 8);

  return (
    // Filmstrip layout: vertical thumbnail rail to the LEFT of the main image
    // on sm+, falling back to a horizontal row below it on mobile. Moving the
    // thumbnails out from under the frame lets the main image grow taller.
    <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-stretch">
      {/* Thumbnail rail */}
      {thumbs.length > 1 && (
        <fieldset className="grid grid-cols-5 gap-2 sm:flex sm:w-[clamp(64px,5.2vw,92px)] sm:shrink-0 sm:flex-col sm:gap-2.5 sm:overflow-y-auto">
          <legend className="sr-only">Product photos</legend>
          {thumbs.map((src, i) => {
            const selected = i === selectedIndex;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setSelectedIndex(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-pressed={selected}
                className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-colors ${
                  selected ? "border-amber-400/80" : "border-white/5 hover:border-amber-400/45"
                }`}
              >
                {selected && (
                  <span className="absolute inset-0 z-10 ring-2 ring-inset ring-amber-400/70" />
                )}
                <Image
                  src={thumbnailUrl(src)}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
                />
              </button>
            );
          })}
        </fieldset>
      )}

      {/* Main image with cursor-tracking zoom. Capped by viewport height so the
          PDP stays above the fold on laptops. */}
      <div className="relative mx-auto aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30 sm:mx-0 sm:min-w-0 sm:flex-1">
        <MagnifiedImage images={thumbs} selectedIndex={selectedIndex} alt={alt} />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {!isSold && (isReserved || badge) && (
          <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
            {isReserved && (
              <span className="border border-amber-400/70 bg-amber-400/90 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-950 shadow-[0_0_24px_rgba(251,191,36,0.16)]">
                Reserved
              </span>
            )}
            {badge && (
              <span className="border border-amber-500/40 bg-black/40 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-amber-400 backdrop-blur-sm">
                {badge}
              </span>
            )}
          </div>
        )}
        {isSold && soldAt && (
          <span className="absolute left-4 top-4 z-20 border border-white/20 bg-black/50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-300 backdrop-blur-sm">
            Sold · {soldAt}
          </span>
        )}
      </div>
    </div>
  );
}
