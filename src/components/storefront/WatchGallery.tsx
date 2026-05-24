"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface WatchGalleryProps {
  images: string[];
  alt: string;
  badge?: string;
  soldAt?: string;
  isSold?: boolean;
}

export function WatchGallery({ images, alt, badge, soldAt, isSold }: WatchGalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

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

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Main image */}
        <div
          className={`relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/30 group cursor-pointer ${
            isSold ? "[filter:grayscale(0.5)] opacity-95" : ""
          }`}
          onClick={() => open(0)}
        >
          <Image
            src={images[0]}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          {badge && !isSold && (
            <span className="absolute top-5 left-5 px-3 py-1.5 border border-amber-500/40 bg-black/40 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-amber-400">
              {badge}
            </span>
          )}
          {isSold && soldAt && (
            <span className="absolute top-5 left-5 px-3 py-1.5 border border-white/20 bg-black/50 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-zinc-300">
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
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            className="absolute top-5 right-5 z-10 text-white/60 hover:text-white font-mono text-[10px] uppercase tracking-[0.2em]"
          >
            Close
          </button>

          {/* Prev */}
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

          {/* Image */}
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

          {/* Next */}
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

          {/* Counter */}
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[11px] text-white/40 tracking-[0.15em]">
            {lightbox + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
