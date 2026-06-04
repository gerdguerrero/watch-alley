"use client";

import { motion } from "framer-motion";
import { Compass, type LucideIcon, Timer, Watch as WatchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import type { Watch } from "@/lib/inventory/types";

const _COLLECTION_PROMISES = [
  "Daylight-photographed",
  "Condition disclosed",
  "Collector-first sourcing",
];

// Each homepage teaser card is labelled by category, not by watch name. The
// watch image behind each card is only a representative hero image; clicking a
// card must open the matching filtered catalog grid, not that single watch.
const CARD_SLOTS = [
  {
    label: "Brand New",
    category: "brand-new",
    badge: undefined,
    href: "/available?category=brand-new",
  },
  {
    label: "Pre-owned",
    category: "pre-owned",
    badge: undefined,
    href: "/available?category=pre-owned",
  },
  {
    label: "Limited Edition",
    category: undefined,
    badge: "limited-edition",
    href: "/available?category=limited-edition",
  },
] as const;

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

interface AccordionCardProps {
  watch: Watch;
  isActive: boolean;
  onActivate: () => void;
  isMobile: boolean;
  /** Card headline override — replaces the watch.name with a category label
      (e.g. "Brand New", "Pre-owned", "Limited Edition"). */
  displayName: string;
  href: string;
}

function AccordionCard({
  watch,
  isActive,
  onActivate,
  isMobile,
  displayName,
  href,
}: AccordionCardProps) {
  const Icon = pickIcon(watch);
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
      className="relative overflow-hidden cursor-pointer rounded-[28px] isolate aspect-[16/9] md:aspect-auto md:min-h-0 md:flex-shrink md:basis-0"
      style={{
        backgroundImage: watch.primaryImage ? `url(${watch.primaryImage})` : undefined,
        backgroundColor: "oklch(0.17 0.015 55)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      animate={isMobile ? {} : { flexGrow: isActive ? 5 : 1 }}
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
        style={{ background: "rgba(33, 31, 29, 0.45)" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: DUR_OVERLAY, ease: EASE }}
        style={{
          background:
            "linear-gradient(to top, rgba(33,31,29,0.95) 0%, rgba(33,31,29,0.5) 45%, rgba(33,31,29,0) 100%)",
          willChange: "opacity",
        }}
      />

      {/* Whole card is a real link to the filtered catalog, not the teaser watch. */}
      <Link
        href={href}
        aria-label={`Browse ${displayName} watches`}
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
        <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center">
          <Icon className="w-5 h-5 text-walnut-deep" />
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
          <div className="w-12 h-12 rounded-full bg-cream flex-shrink-0 flex items-center justify-center">
            <Icon className="w-5 h-5 text-walnut-deep" />
          </div>
          <div className="min-w-0">
            <div className="w-8 h-px bg-amber-500/60 mb-3" />
            <h3 className="text-3xl md:text-4xl font-light text-cream leading-none break-words">
              {displayName}
            </h3>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CollectionSection({ watches = [] }: CollectionSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();

  // Pick one watch per category for the 3 teaser cards. Evaluates them in order of
  // specificity (Limited Edition first as it's the most restricted, then Pre-owned,
  // then Brand New) to prevent duplicates and ensure each card shows a unique piece.
  const items = useMemo(() => {
    const selectedIds = new Set<string>();
    const slotMatches: Record<string, Watch> = {};

    const sortedSlots = [CARD_SLOTS[2], CARD_SLOTS[1], CARD_SLOTS[0]] as const;

    // First pass: find a unique match for each slot
    for (const slot of sortedSlots) {
      let match: Watch | undefined;
      if (slot.badge) {
        match = watches.find((w) => w.badges.includes(slot.badge!) && !selectedIds.has(w.id));
      } else if (slot.category) {
        match = watches.find((w) => w.category === slot.category && !selectedIds.has(w.id));
      }
      if (match) {
        slotMatches[slot.label] = match;
        selectedIds.add(match.id);
      }
    }

    // Second pass: fill in any remaining slots with standard fallbacks
    for (const slot of CARD_SLOTS) {
      if (!slotMatches[slot.label]) {
        let fallback: Watch | undefined;
        if (slot.badge) {
          fallback = watches.find((w) => w.badges.includes(slot.badge!)) ?? watches[0];
        } else if (slot.category) {
          fallback = watches.find((w) => w.category === slot.category) ?? watches[0];
        } else {
          fallback = watches[0];
        }
        if (fallback) {
          slotMatches[slot.label] = fallback;
        }
      }
    }

    // Return the matches mapped back to the original CARD_SLOTS layout order
    return CARD_SLOTS.map((slot) => {
      const match = slotMatches[slot.label];
      return { watch: match, label: slot.label, href: slot.href };
    }).filter((item) => !!item.watch) as Array<{ watch: Watch; label: string; href: string }>;
  }, [watches]);

  // Track the hovered active card label
  const [intendedActiveLabel, setActiveLabel] = useState<string | null>(items[0]?.label ?? null);

  const activeLabel =
    items.find((item) => item.label === intendedActiveLabel)?.label ?? items[0]?.label ?? null;

  if (watches.length === 0) {
    return (
      <section
        id="collection"
        ref={sectionRef}
        className="relative bg-walnut-deep py-32 md:py-48 text-center"
      >
        <p className="text-zinc-500 uppercase tracking-[0.18em] text-xs">
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
      className="relative flex flex-col justify-center overflow-hidden bg-walnut-deep py-16 md:py-20 lg:min-h-[760px] lg:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundTwo})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-walnut-deep via-transparent to-walnut-deep" />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)",
          }}
        />
        <svg
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[150px] opacity-25"
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

      {/* Unified Editorial Section Title */}
      <div className="relative z-10 text-center mb-10 lg:mb-12">
        <span className="text-[10px] tracking-[0.32em] text-amber-300/80 uppercase font-mono block mb-2">
          ◆ Curated Selection
        </span>
        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream font-light tracking-tight uppercase">
          Available Pieces
        </h2>
        <p className="font-serif italic text-sm text-cream-60 mt-2">In rotation, right now.</p>
      </div>

      {/* Accordion Teaser Grid */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        {items.length === 0 ? (
          <p className="text-center text-zinc-500 uppercase tracking-[0.18em] text-xs py-8">
            No pieces in rotation right now.
          </p>
        ) : (
          <div className="max-w-[1680px] mx-auto gap-3 flex flex-col md:flex-row md:h-[380px] lg:h-[400px]">
            {items.map((item) => (
              <AccordionCard
                key={item.label}
                watch={item.watch}
                // On phone every card is expanded so all available pieces are
                // visible at a glance; desktop keeps the accordion behaviour.
                isActive={isMobile ? true : activeLabel === item.label}
                onActivate={() => setActiveLabel(item.label)}
                isMobile={isMobile}
                displayName={item.label}
                href={item.href}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href="/available"
            className="group inline-flex items-center gap-3 border-b border-amber-500/40 pb-1 text-[12px] tracking-[0.22em] uppercase text-amber-400 transition-colors hover:text-amber-300 hover:border-amber-400"
          >
            Browse Full Collection — {watches.length} pieces
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
      </div>
    </section>
  );
}
