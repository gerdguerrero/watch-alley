"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Cursor‑tracking full‑image zoom                                   */
/*  Hover → image scales 3× and pans to follow the cursor.            */
/*  No lens, no side panel — the entire container becomes the zoom    */
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

  const handleMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={alt}
      onMouseEnter={() => setHover(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(false)}
      className="relative w-full h-full overflow-hidden"
    >
      {images.map((src, index) => {
        const selected = index === selectedIndex;
        return (
          <Image
            key={src}
            src={src}
            alt={selected ? alt : ""}
            fill
            sizes="(max-width: 1024px) calc(100vw - 48px), 760px"
            preload={index === 0}
            loading={index === 0 ? undefined : "eager"}
            draggable={false}
            className={`absolute top-0 left-0 h-full w-full object-cover transition-opacity duration-150 ease-out ${
              selected ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: hover ? "scale(3)" : "scale(1)",
              transformOrigin: `${origin.x}% ${origin.y}%`,
              willChange: selected ? "transform" : "auto",
            }}
          />
        );
      })}
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
}

export function WatchGallery({ images, alt, badge, soldAt, isSold }: WatchGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Main image with cursor-tracking zoom */}
      <div
        className={`relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30 cursor-zoom-in ${
          isSold ? "[filter:grayscale(0.5)] opacity-95" : ""
        }`}
      >
        <MagnifiedImage images={images.slice(0, 8)} selectedIndex={selectedIndex} alt={alt} />

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        {badge && !isSold && (
          <span className="absolute top-5 left-5 px-3 py-1.5 border border-amber-500/40 bg-black/40 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-amber-400 z-20">
            {badge}
          </span>
        )}
        {isSold && soldAt && (
          <span className="absolute top-5 left-5 px-3 py-1.5 border border-white/20 bg-black/50 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-zinc-300 z-20">
            Sold · {soldAt}
          </span>
        )}
      </div>

      {/* Thumbnails select the main zoom frame, like a conventional ecommerce PDP. */}
      {images.length > 1 && (
        <fieldset className="grid grid-cols-4 gap-3">
          <legend className="sr-only">Product photos</legend>
          {images.slice(0, 8).map((src, i) => {
            const selected = i === selectedIndex;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setSelectedIndex(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-pressed={selected}
                className={`group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border transition-colors ${
                  selected ? "border-amber-400/80" : "border-white/5 hover:border-amber-400/45"
                }`}
              >
                {selected && (
                  <span className="absolute inset-0 z-10 ring-2 ring-inset ring-amber-400/70" />
                )}
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
                />
              </button>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
