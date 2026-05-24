"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Image Magnifier — Amazon‑style lens‑on‑hover with side‑panel zoom  */
/* ------------------------------------------------------------------ */

function useMagnifier() {
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPos({ x, y });
  }, []);

  const onEnter = useCallback(() => setHover(true), []);
  const onLeave = useCallback(() => setHover(false), []);

  return { hover, pos, containerRef, onMove, onEnter, onLeave };
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
  const [lightbox, setLightbox] = useState<number | null>(null);
  const magnifier = useMagnifier();

  const open = useCallback((index: number) => setLightbox(index), []);
  const close = useCallback(() => setLightbox(null), []);
  const prev = useCallback(() => {
    setLightbox((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);
  const next = useCallback(() => {
    setLightbox((i) => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, prev, next]);

  if (images.length === 0) return null;

  const mainSrc = images[0];
  const ZOOM = 2.5; // magnification factor

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Main image with magnifier */}
        <div
          ref={magnifier.containerRef}
          onMouseMove={magnifier.onMove}
          onMouseEnter={magnifier.onEnter}
          onMouseLeave={magnifier.onLeave}
          onClick={() => open(0)}
          className={`relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30 cursor-crosshair group ${
            isSold ? "[filter:grayscale(0.5)] opacity-95" : ""
          }`}
        >
          {/* Base image — fades out when magnifier lens is active */}
          <Image
            src={mainSrc}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className={`object-cover transition-opacity duration-200 ${
              magnifier.hover ? "opacity-30" : "opacity-100"
            }`}
            priority
          />

          {/* Magnifier lens — follows cursor, shows zoomed region */}
          {magnifier.hover && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${magnifier.pos.x * 100}%`,
                top: `${magnifier.pos.y * 100}%`,
                width: "140px",
                height: "140px",
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: "2px solid rgba(245, 158, 11, 0.6)",
                boxShadow: "0 0 20px rgba(0,0,0,0.5), 0 0 0 9999px rgba(0,0,0,0.35)",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              <img
                src={mainSrc}
                alt=""
                style={{
                  position: "absolute",
                  width: `${ZOOM * 100}%`,
                  height: `${ZOOM * 100}%`,
                  left: `${-magnifier.pos.x * (ZOOM - 1) * 100}%`,
                  top: `${-magnifier.pos.y * (ZOOM - 1) * 100}%`,
                  maxWidth: "none",
                }}
                draggable={false}
              />
            </div>
          )}

          {/* Inline zoom panel — slides in from the right on desktop */}
          <div
            className={`absolute top-0 bottom-0 hidden lg:flex items-center justify-center bg-black/90 border-l border-white/10 transition-all duration-200 ease-out ${
              magnifier.hover
                ? "right-0 w-[42%] opacity-100"
                : "-right-full w-0 opacity-0"
            }`}
            style={{ zIndex: 5 }}
          >
            {magnifier.hover && (
              <div className="relative w-full h-full overflow-hidden">
                <img
                  src={mainSrc}
                  alt=""
                  style={{
                    position: "absolute",
                    width: `${ZOOM * 100}%`,
                    height: `${ZOOM * 100}%`,
                    left: `${-magnifier.pos.x * (ZOOM - 1) * 100}%`,
                    top: `${-magnifier.pos.y * (ZOOM - 1) * 100}%`,
                    maxWidth: "none",
                  }}
                  draggable={false}
                />
              </div>
            )}
          </div>

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

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-3">
            {images.slice(0, 8).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => open(i)}
                className="relative aspect-square overflow-hidden rounded-2xl border border-white/5 group cursor-pointer"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-125"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-5 right-5 z-10 text-white/60 hover:text-white font-mono text-[10px] uppercase tracking-[0.2em]"
          >
            Close
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 md:left-8 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            className="relative w-[90vw] h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightbox]}
              alt={`${alt} — photo ${lightbox + 1} of ${images.length}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 md:right-8 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
            aria-label="Next"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[11px] text-white/40 tracking-[0.15em]">
            {lightbox + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
