"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";
import { WatchScene } from "./watch-scene";

gsap.registerPlugin(ScrollTrigger);

const MotionLink = motion.create(Link);

interface HeroProps {
  featured?: Watch | null;
}

const TRUST_MARKERS = ["Manila-based", "Condition disclosed", "Insured shipping"];

export function Hero({ featured = null }: HeroProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const splineContainerRef = useRef<HTMLDivElement>(null);
  const ghostTextRef = useRef<HTMLHeadingElement>(null);
  const bottomLeftRef = useRef<HTMLDivElement>(null);
  const bottomRightRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const splineY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const splineScale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);
  const splineOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const ghostTextX = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const ghostTextOpacity = useTransform(scrollYProgress, [0, 0.5], [0.52, 0]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bottomLeftRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
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
          duration: 1,
          delay: 1,
          ease: "power3.out",
        }
      );

      gsap.to(ghostTextRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
        y: 150,
        scale: 1.08,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[760px] overflow-hidden bg-[#080706] text-zinc-100"
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_52%_42%,rgba(214,166,74,0.16),transparent_58%),linear-gradient(180deg,rgba(8,7,6,0.48)_0%,rgba(8,7,6,0.78)_58%,#080706_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#080706] to-transparent" />

      {/* Background Ghost Text */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
        style={{ x: ghostTextX, opacity: ghostTextOpacity }}
      >
        <h1
          ref={ghostTextRef}
          className="font-serif font-medium leading-none tracking-tight select-none text-transparent"
          style={{
            fontSize: "clamp(5rem, 18vw, 18rem)",
            background:
              "linear-gradient(180deg, rgba(250, 250, 249, 0.42) 0%, rgba(250, 250, 249, 0.08) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          WATCH
        </h1>
      </motion.div>

      {/* 3D Watch Container - Centered with scroll animations */}
      <motion.div
        ref={splineContainerRef}
        id="watch-canvas-container"
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{
          y: splineY,
          scale: splineScale,
          opacity: splineOpacity,
        }}
      >
        <div className="mx-auto h-full max-h-[82vh] w-full max-w-4xl lg:translate-x-[12vw]">
          <WatchScene />
        </div>
      </motion.div>

      {/* Bottom Left Content */}
      <div
        ref={bottomLeftRef}
        className="absolute bottom-20 left-6 z-20 max-w-xl opacity-0 md:bottom-16 md:left-12 lg:left-20"
      >
        <motion.p
          className="mb-4 text-[11px] uppercase tracking-[0.32em] text-amber-300/80 font-mono"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          The Watch Alley PH
        </motion.p>
        <h2 className="max-w-lg text-[clamp(3.25rem,5vw,4.75rem)] font-light leading-[0.98] tracking-tight text-cream">
          <span className="font-serif italic">Curated watches.</span>
          <br />
          <span className="text-cream-60">Clearly disclosed.</span>
        </h2>
        <p className="mt-6 max-w-[34rem] text-sm leading-relaxed text-cream-60 md:text-base">
          Pre-owned and brand-new timepieces, photographed honestly and handled through a calm
          Manila collecting desk.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {TRUST_MARKERS.map((marker) => (
            <span
              key={marker}
              className="rounded-full border border-amber-400/20 bg-black/25 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-cream-60 backdrop-blur"
            >
              {marker}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <MotionLink
            href="/available"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-amber-300 px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#090806] shadow-[0_20px_50px_rgba(245,158,11,0.18)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span>Explore Collection</span>
            <svg
              className="ml-3 h-3 w-3 transition-transform group-hover:translate-x-1"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
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
            className="inline-flex items-center justify-center rounded-full border border-cream/15 bg-black/20 px-7 py-4 text-[11px] uppercase tracking-[0.2em] text-cream transition-colors hover:border-amber-300/50 hover:text-amber-200"
            whileTap={{ scale: 0.98 }}
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
            className="group block rounded-3xl border border-amber-400/15 bg-black/30 p-6 text-left shadow-2xl backdrop-blur-md transition-colors hover:border-amber-300/40"
          >
            <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-mono">
              ◆ Featured · Available now
            </p>
            <p className="font-serif text-2xl leading-tight text-cream">
              {featured.brand}
              <br />
              <span className="italic text-cream-80">{featured.name}</span>
            </p>
            <p className="mt-4 font-serif text-xl text-amber-300">{formatPhp(featured.price)}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-cream-60 transition-colors group-hover:text-amber-300">
              View this piece
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M1 11L11 1M11 1H3M11 1V9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        ) : (
          <div className="rounded-3xl border border-amber-400/15 bg-black/30 p-6 backdrop-blur-md">
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
                  transition={{ delay: 1.4 + i * 0.1, duration: 0.5 }}
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
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
