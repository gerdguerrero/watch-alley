"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Compass, type LucideIcon, Timer, Watch as WatchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";

const COLLECTION_PROMISES = [
  "Daylight-photographed",
  "Condition disclosed",
  "Collector-first sourcing",
];

// Single timing source for every motion in the accordion so the container
// resize, overlay tint, icon pill, and text opacity stay perfectly in step
// when the user flicks the cursor across cards. Curve is Apple's standard
// ease-out-quint — slow start, very gentle settle.
const EASE = [0.32, 0.72, 0, 1] as const;
const DUR_CONTAINER = 0.75;
const DUR_FADE_IN = 0.45;
const DUR_FADE_OUT = 0.25;
const DUR_OVERLAY = 0.6;

// Hover-intent window — flicking the cursor across the row no longer fires
// 5 activations in a row, only one once the cursor settles.
const HOVER_INTENT_MS = 60;

interface CollectionSectionProps {
  watches?: Watch[];
}

/**
 * Derive a lucide icon from a watch's movement / edition language so each
 * accordion card visually differs without hand-tagging in the CMS.
 */
function pickIcon(watch: Watch): LucideIcon {
  const haystack = `${watch.movement} ${watch.edition} ${watch.name}`.toLowerCase();
  if (/(tourbillon|gmt|compass)/.test(haystack)) return Compass;
  if (/(chrono|chronograph|quartz|timer)/.test(haystack)) return Timer;
  return WatchIcon;
}

function deriveCategory(watch: Watch): string {
  return watch.edition || watch.movement || watch.conditionLabel || "Curated";
}

interface AccordionCardProps {
  watch: Watch;
  isActive: boolean;
  onActivate: () => void;
  isMobile: boolean;
}

function AccordionCard({ watch, isActive, onActivate, isMobile }: AccordionCardProps) {
  const Icon = pickIcon(watch);
  const category = deriveCategory(watch);
  const intentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover-intent: only activate after the cursor lingers HOVER_INTENT_MS so a
  // quick flick across the row doesn't trigger a rapid sequence of activations.
  const handleEnter = () => {
    if (isMobile) return;
    if (intentTimer.current) clearTimeout(intentTimer.current);
    intentTimer.current = setTimeout(onActivate, HOVER_INTENT_MS);
  };
  const handleLeave = () => {
    if (intentTimer.current) {
      clearTimeout(intentTimer.current);
      intentTimer.current = null;
    }
  };

  // Both pill-positions and the title block are ALWAYS rendered. We swap them
  // with pure opacity so flicking the cursor across cards does not mount /
  // unmount text.
  return (
    <motion.div
      className="relative overflow-hidden cursor-pointer rounded-[28px] flex-shrink basis-0 isolate"
      style={{
        backgroundImage: watch.primaryImage ? `url(${watch.primaryImage})` : undefined,
        backgroundColor: "#111",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      animate={isMobile ? { height: isActive ? 340 : 80 } : { flexGrow: isActive ? 5 : 1 }}
      transition={{ duration: DUR_CONTAINER, ease: EASE }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={!isMobile ? onActivate : undefined}
      onClick={isMobile ? onActivate : undefined}
    >
      {/* Tinted overlay — TWO layered divs so the colour interpolation is
          pure opacity (browsers cannot tween between a gradient and a flat
          rgba(), which was the source of the abrupt feel). */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "rgba(0, 0, 0, 0.45)" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: DUR_OVERLAY, ease: EASE }}
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 100%)",
          willChange: "opacity",
        }}
      />

      {/* Whole card is also a real link to the watch detail page. */}
      <Link
        href={`/watch/${watch.slug}`}
        aria-label={`${watch.brand} ${watch.name}`}
        className="absolute inset-0 z-20"
      />

      {/* Collapsed pill — centered. Always rendered, opacity 0 when active. */}
      <motion.div
        aria-hidden={isActive}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
        animate={{ opacity: isActive ? 0 : 1 }}
        transition={{
          duration: isActive ? DUR_FADE_OUT : DUR_FADE_IN,
          ease: EASE,
        }}
        style={{ pointerEvents: isActive ? "none" : "auto", willChange: "opacity" }}
      >
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
          <Icon className="w-5 h-5 text-black" />
        </div>
      </motion.div>

      {/* Expanded title block — anchored bottom-left. Always rendered, opacity
          0 when inactive. */}
      <motion.div
        aria-hidden={!isActive}
        className="absolute bottom-0 left-0 right-0 p-7 z-10"
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{
          duration: isActive ? DUR_FADE_IN : DUR_FADE_OUT,
          // Small delay only on enter so the container has started growing
          // before the text appears — feels led by the resize, not racing it.
          delay: isActive ? 0.18 : 0,
          ease: EASE,
        }}
        style={{ pointerEvents: isActive ? "auto" : "none", willChange: "opacity" }}
      >
        <div className="flex items-end gap-5">
          <div className="w-12 h-12 rounded-full bg-white flex-shrink-0 flex items-center justify-center">
            <Icon className="w-5 h-5 text-black" />
          </div>
          <div className="min-w-0">
            <div className="w-8 h-px bg-amber-500/60 mb-3" />
            <p className="text-[10px] tracking-[0.3em] uppercase text-amber-500/80 mb-1 font-mono">
              {watch.brand}
            </p>
            <h3 className="text-3xl md:text-4xl font-light text-white leading-none mb-2 break-words">
              {watch.name}
            </h3>
            <p className="text-[10px] tracking-[0.25em] uppercase text-zinc-400">
              {category}
              {watch.price > 0 && (
                <span className="ml-3 text-amber-500/90 normal-case tracking-wide font-serif text-base">
                  {formatPhp(watch.price)}
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CollectionSection({ watches = [] }: CollectionSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isMobile = useIsMobile();
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Pills derived from the brands actually present in the inventory.
  // "ALL" is always first; the rest are unique brands, capped at 5 so the row
  // doesn't overflow at mid-breakpoints.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const w of watches) if (w.brand) set.add(w.brand);
    return ["All", ...Array.from(set).slice(0, 5)];
  }, [watches]);

  const [activeCategory, setActiveCategory] = useState("All");

  // Watches filtered by the active pill, then capped at 5 for the accordion.
  const items = useMemo(() => {
    const filtered =
      activeCategory === "All" ? watches : watches.filter((w) => w.brand === activeCategory);
    return filtered.slice(0, 5);
  }, [watches, activeCategory]);

  // Track only the user's intent; the actual active slug is derived below
  // so we never need a useEffect to reconcile filter changes
  // (rerender-derived-state-no-effect).
  const [intendedActiveId, setActiveId] = useState<string | null>(items[0]?.slug ?? null);

  // If the intended slug is no longer in the visible set (filter changed or
  // inventory updated), fall back to the first visible card. Pure render-time
  // derivation — no extra state, no effect, no second render pass.
  const activeId = items.find((w) => w.slug === intendedActiveId)?.slug ?? items[0]?.slug ?? null;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [100, -100]);

  // Whole-section empty: no inventory at all. (Empty per-filter is handled
  // inline below so the pills stay visible.)
  if (watches.length === 0) {
    return (
      <section
        id="collection"
        ref={sectionRef}
        className="relative bg-[#080706] py-32 md:py-48 text-center"
      >
        <p className="text-zinc-500 font-mono uppercase tracking-[0.3em] text-sm">
          No pieces available right now —{" "}
          <Link href="/sold" className="text-amber-400 underline-offset-4 hover:underline">
            browse the sold archive
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section
      id="collection"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#080706] py-32 md:py-48"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundTwo})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080706] via-transparent to-[#080706]" />
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)",
          }}
        />
        <svg
          className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[200px] opacity-30"
          viewBox="0 0 800 200"
          aria-hidden="true"
        >
          <path
            d="M 0 200 Q 400 0 800 200"
            fill="none"
            stroke="url(#arcGradient)"
            strokeWidth="1"
          />
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(245, 158, 11, 0.6)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Title */}
      <motion.div className="relative z-10 text-center mb-12" style={{ y: titleY }}>
        <h2
          ref={titleRef}
          className="text-[15vw] md:text-[12vw] font-light tracking-tight leading-none select-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          COLLECTION
        </h2>
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto -mt-8 mb-14 max-w-3xl px-6 text-center md:mb-20"
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.15 }}
      >
        <p className="mb-4 text-[11px] uppercase tracking-[0.32em] text-amber-300/80 font-mono">
          Current Rotation
        </p>
        <h3 className="font-serif text-3xl leading-tight text-cream md:text-5xl">
          A tighter edit of watches worth slowing down for.
        </h3>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-cream-60 md:text-base">
          Every listing is selected for presence, story, and everyday wearability — from attainable
          Japanese references to collector-grade rarities.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {COLLECTION_PROMISES.map((promise) => (
            <span
              key={promise}
              className="rounded-full border border-amber-400/20 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-cream-60 backdrop-blur"
            >
              {promise}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Filter pills — derived from real inventory brands. Selecting a pill
          re-filters the accordion (caps at 5 cards). */}
      {categories.length > 1 && (
        <motion.div
          className="relative z-10 flex flex-wrap justify-center gap-3 mb-16 md:mb-20 px-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {categories.map((category) => (
            <motion.button
              type="button"
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2.5 rounded-full text-[11px] tracking-[0.15em] uppercase border transition-all duration-300 ${
                activeCategory === category
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              {category}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Accordion (or inline "no matches" message when a filter rejects everything) */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        {items.length === 0 ? (
          <p className="text-center text-zinc-500 font-mono uppercase tracking-[0.3em] text-sm py-12">
            No {activeCategory} pieces in rotation right now.
          </p>
        ) : (
          <div className="max-w-7xl mx-auto gap-3 flex flex-col md:flex-row md:h-[580px]">
            {items.map((watch) => (
              <AccordionCard
                key={watch.slug}
                watch={watch}
                isActive={activeId === watch.slug}
                onActivate={() => setActiveId(watch.slug)}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}

        {watches.length > items.length && (
          <div className="mt-12 flex justify-center">
            <Link
              href="/available"
              className="group inline-flex items-center gap-3 border-b border-amber-500/40 pb-1 text-[12px] tracking-[0.22em] uppercase text-amber-400 transition-colors hover:text-amber-300 hover:border-amber-400"
            >
              See full collection — {watches.length} pieces
              <svg
                className="w-3 h-3 transition-transform group-hover:translate-x-1"
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
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
