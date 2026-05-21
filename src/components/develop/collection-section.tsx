"use client";

import { AnimatePresence, motion, useInView, useScroll, useTransform } from "framer-motion";
import { Compass, type LucideIcon, Timer, Watch as WatchIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";

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

  return (
    <motion.div
      className="relative overflow-hidden cursor-pointer"
      style={{
        backgroundImage: watch.primaryImage ? `url(${watch.primaryImage})` : undefined,
        backgroundColor: "#111",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "28px",
        flexShrink: 1,
        flexBasis: 0,
      }}
      animate={
        isMobile
          ? { height: isActive ? 340 : 80 }
          : { flexGrow: isActive ? 5 : 1 }
      }
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={!isMobile ? onActivate : undefined}
      onClick={isMobile ? onActivate : undefined}
    >
      {/* Overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: isActive
            ? "linear-gradient(to top, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.2) 100%)"
            : "rgba(0,0,0,0.45)",
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Whole card is also a real link to the watch detail page. */}
      <Link
        href={`/watch/${watch.slug}`}
        aria-label={`${watch.brand} ${watch.name}`}
        className="absolute inset-0 z-20"
      />

      {/* Collapsed icon */}
      <AnimatePresence>
        {!isActive && (
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <Icon className="w-5 h-5 text-black" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-7 z-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, delay: 0.2 }}
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function CollectionSection({ watches = [] }: CollectionSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isMobile = useIsMobile();
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Cap the accordion at 5 cards — beyond that the row gets cramped at all breakpoints.
  const items = watches.slice(0, 5);
  const [activeId, setActiveId] = useState<string | null>(items[0]?.slug ?? null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [100, -100]);

  if (items.length === 0) {
    return (
      <section
        id="collection"
        ref={sectionRef}
        className="relative bg-[#0a0a0a] py-32 md:py-48 text-center"
      >
        <p className="text-zinc-500 font-mono uppercase tracking-[0.3em] text-sm">
          No pieces available right now —{" "}
          <Link
            href="/sold"
            className="text-amber-400 underline-offset-4 hover:underline"
          >
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
      className="relative bg-[#0a0a0a] py-32 md:py-48 overflow-hidden"
    >
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
      <motion.div className="relative z-10 text-center mb-20" style={{ y: titleY }}>
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

      {/* Eyebrow */}
      <motion.div
        className="relative z-10 flex justify-center mb-16 md:mb-20"
        initial={{ opacity: 0, y: 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-px bg-amber-500/60" />
          <span className="text-[11px] tracking-[0.3em] text-amber-500/80 uppercase font-mono">
            In rotation · {items.length} {items.length === 1 ? "piece" : "pieces"}
          </span>
          <div className="w-12 h-px bg-amber-500/60" />
        </div>
      </motion.div>

      {/* Accordion */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
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
