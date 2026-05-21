"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Watch } from "@/lib/inventory/types";
import { WatchCard } from "./watch-card";

gsap.registerPlugin(ScrollTrigger);

interface CollectionSectionProps {
  watches?: Watch[];
}

export function CollectionSection({ watches = [] }: CollectionSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const titleY = useTransform(scrollYProgress, [0, 1], [100, -100]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const w of watches) {
      if (w.brand) set.add(w.brand);
    }
    return ["All", ...Array.from(set).slice(0, 5)];
  }, [watches]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return watches;
    return watches.filter((w) => w.brand === activeCategory);
  }, [watches, activeCategory]);

  useEffect(() => {
    const ctx = gsap.context(() => {}, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="collection"
      ref={sectionRef}
      className="relative bg-[#0a0a0a] py-32 md:py-48 overflow-hidden"
    >
      {/* Ambient glow - MDX style arc */}
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

      {/* Large centered title - MDX style */}
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

      {/* Filter pills - derived from real inventory brands */}
      {categories.length > 1 && (
        <motion.div
          className="relative z-10 flex flex-wrap justify-center gap-3 mb-16 md:mb-24 px-6"
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

      {/* Collection Grid */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
            {filtered.map((watch, index) => (
              <WatchCard key={watch.slug} watch={watch} index={index} />
            ))}
          </div>
        ) : (
          <p className="text-center text-zinc-500 text-sm font-mono uppercase tracking-[0.2em]">
            No pieces in this category right now. Check{" "}
            <Link
              href="/available"
              className="text-amber-400 underline-offset-4 hover:underline"
            >
              the full collection
            </Link>
            .
          </p>
        )}
      </div>

      {/* See full collection link */}
      {watches.length > 0 && (
        <div className="relative z-10 mt-16 flex justify-center">
          <Link
            href="/available"
            className="group inline-flex items-center gap-3 border-b border-amber-500/40 pb-1 text-[12px] tracking-[0.22em] uppercase text-amber-400 transition-colors hover:text-amber-300 hover:border-amber-400"
          >
            See full collection
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
    </section>
  );
}
