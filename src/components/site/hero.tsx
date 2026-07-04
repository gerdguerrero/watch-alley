"use client";

import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";
import { ErrorBoundary } from "./ErrorBoundary";

const WatchScene = dynamic(() => import("./watch-scene").then((mod) => mod.WatchScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-300/25 border-t-amber-300" />
    </div>
  ),
});

gsap.registerPlugin(ScrollTrigger);

const MotionLink = motion.create(Link);

interface HeroProps {
  featured?: Watch | null;
}

export function Hero({ featured = null }: HeroProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const splineContainerRef = useRef<HTMLDivElement>(null);
  const bottomLeftRef = useRef<HTMLDivElement>(null);
  const bottomRightRef = useRef<HTMLDivElement>(null);
  const [enableWatchScene, setEnableWatchScene] = useState(false);

  useEffect(() => {
    const webglAvailable = (() => {
      try {
        const canvas = document.createElement("canvas");
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
      } catch (_e) {
        return false;
      }
    })();

    const canUseWatchScene =
      webglAvailable && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnableWatchScene(canUseWatchScene);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bottomLeftRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.4,
          delay: 0.8,
          ease: "power3.out",
        }
      );

      gsap.fromTo(
        bottomRightRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          delay: 1,
          ease: "power3.out",
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[760px] overflow-hidden bg-walnut-deep text-zinc-100"
    >
      {/* Brand texture from the Drive background set. */}
      <Image
        src={BRAND_ASSETS.backgroundOne}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-[0.34] saturate-50"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_52%_42%,rgba(214,166,74,0.16),transparent_58%),linear-gradient(180deg,rgba(33,31,29,0.48)_0%,rgba(33,31,29,0.78)_58%,oklch(0.13_0.012_55)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-walnut-deep to-transparent" />

      {/* 3D Watch Container - static across all viewports. Earlier this had
          scroll-tied y/scale/opacity transforms that caused the canvas to
          visibly shrink and fade as the user scrolled past the hero (and
          spring back on scroll-up). Removed so the canvas stays put. */}
      <div
        ref={splineContainerRef}
        id="watch-canvas-container"
        className="absolute inset-0 z-10 flex items-center justify-center"
      >
        <div className="mx-auto h-full max-h-[74vh] w-full max-w-4xl lg:translate-x-[16vw]">
          {enableWatchScene ? (
            <ErrorBoundary fallback={<HeroStaticVisual featured={featured} />}>
              <WatchScene />
            </ErrorBoundary>
          ) : (
            <HeroStaticVisual featured={featured} />
          )}
        </div>
      </div>

      {/* Bottom Left Content. On phone the text sits over the 3D watch which
          tanks contrast, so wrap the block in a frosted-glass card; on md+ the
          card styling resets and copy reads flat over the brand bg. */}
      <div
        ref={bottomLeftRef}
        className="absolute bottom-20 left-6 right-6 z-20 max-w-xl rounded-2xl border border-amber-400/15 bg-walnut-deep/25 p-5 opacity-0 backdrop-blur-md md:bottom-16 md:left-12 md:right-auto md:rounded-none md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none lg:left-20"
      >
        <motion.p
          className="mb-4 text-[11px] uppercase tracking-[0.32em] text-amber-300/80 font-mono"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        >
          The Watch Alley PH
        </motion.p>
        <h2 className="max-w-xl text-[clamp(3.25rem,5vw,4.75rem)] font-light leading-[0.98] tracking-tight text-cream">
          <span className="font-serif italic">Curated Timepieces,</span>
          <br />
          <span className="text-cream-60 font-bold">destined for</span>
          <br />
          <span className="text-cream-60 font-bold">your wrist.</span>
        </h2>
        {/* CTAs: on phone keep them in one row with Explore on the right and
            Book a viewing on the left (flex-row-reverse keeps the DOM order
            Explore-first / Book-second for SEO + accessibility). Buttons share
            the row via flex-1 and tighten their padding so both fit at 320px. */}
        <div className="mt-8 flex flex-row-reverse gap-2 sm:gap-3 md:flex-row">
          <MotionLink
            href="/available"
            className="group relative inline-flex flex-1 items-center justify-center overflow-hidden rounded-full bg-amber-300 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-walnut-deep shadow-[0_20px_50px_rgba(245,158,11,0.18)] md:flex-initial md:px-7 md:py-4 md:text-[11px] md:tracking-[0.2em]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>Explore Collection</span>
            <svg
              className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1 md:ml-3"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <title>Arrow</title>
              <path
                d="M1 11L11 1M11 1H3M11 1V9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </MotionLink>
          <MotionLink
            href="#contact"
            className="inline-flex flex-1 items-center justify-center rounded-full border border-cream/15 bg-walnut-deep/20 px-3 py-3 text-[10px] uppercase tracking-[0.16em] text-cream transition-colors hover:border-amber-300/50 hover:text-amber-200 md:flex-initial md:px-7 md:py-4 md:text-[11px] md:tracking-[0.2em]"
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Book a viewing
          </MotionLink>
        </div>
      </div>

      {/* Bottom Right Content */}
      <div
        ref={bottomRightRef}
        className="absolute right-6 bottom-16 z-20 hidden max-w-sm text-right opacity-0 md:block md:right-12 lg:right-20"
      >
        {featured ? (
          <Link
            href={`/watch/${featured.slug}`}
            className="group relative block w-72 overflow-hidden rounded-3xl text-left"
          >
            {/* Actual featured-watch photo as the card backdrop. The info sits
                on a bottom-anchored gradient so the image reads as the hero of
                the card - same treatment as the collection WatchCard. */}
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-walnut-deep/40">
              {featured.primaryImage ? (
                <Image
                  src={featured.primaryImage}
                  alt={`${featured.brand} ${featured.name}`}
                  fill
                  sizes="288px"
                  className="object-cover opacity-50 transition-[transform,filter,opacity] duration-700 ease-out [filter:grayscale(0.85)_sepia(0.25)_brightness(0.82)] group-hover:scale-105 group-hover:opacity-100 group-hover:[filter:grayscale(0)_sepia(0)_brightness(1)]"
                />
              ) : (
                <div className="absolute inset-0 bg-walnut-deep" />
              )}
              {/* Warm walnut/amber wash so the photo reads in the hero palette
                  rather than fighting it; eases off on hover as color returns. */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-900/25 via-walnut-deep/15 to-walnut-deep/55 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-walnut-deep via-walnut-deep/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-300/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>

            <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-walnut-deep/50 px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-amber-300/90 font-mono backdrop-blur-sm">
              ◆ Featured
            </span>

            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-mono">
                {featured.brand}
              </p>
              <p className="mt-2 font-serif text-xl italic leading-tight text-cream line-clamp-2">
                {featured.name}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="font-serif text-xl text-amber-300">
                  {formatPhp(featured.price)}
                </span>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cream-60 transition-colors group-hover:text-amber-300">
                  View
                  <svg
                    className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <title>Arrow</title>
                    <path
                      d="M1 11L11 1M11 1H3M11 1V9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl border border-amber-400/15 bg-walnut-deep/30 p-6 backdrop-blur-md">
            <p className="mb-5 text-sm leading-relaxed text-cream-60">
              Intricate complications, immersive design, bold heritage.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {["Japanese", "Swiss", "Limited"].map((tag, i) => (
                <motion.span
                  key={tag}
                  className="border border-zinc-800 px-4 py-2 text-xs uppercase tracking-[0.15em] text-zinc-500"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 + i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{
                    borderColor: "rgb(245, 158, 11)",
                    color: "rgb(245, 158, 11)",
                  }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <span className="text-[9px] uppercase tracking-[0.3em] text-cream-60">Scroll</span>
        <motion.div
          className="h-6 w-px bg-gradient-to-b from-amber-300/60 to-transparent"
          animate={{ scaleY: [1, 1.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}

function HeroStaticVisual({ featured }: { featured?: Watch | null }) {
  const imageSrc = featured?.primaryImage ?? BRAND_ASSETS.coverPhoto;
  const imageAlt = featured
    ? `${featured.brand} ${featured.name}`
    : "The Watch Alley curated watch selection";

  return (
    <div className="relative h-full w-full">
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        priority
        sizes="(max-width: 767px) 100vw, 896px"
        className="object-contain px-6 opacity-80 saturate-75 [filter:drop-shadow(0_28px_70px_rgba(0,0,0,0.55))] md:px-10 md:opacity-65"
      />
    </div>
  );
}
