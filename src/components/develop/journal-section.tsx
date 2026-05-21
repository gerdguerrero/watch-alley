"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import type { JournalPost } from "@/lib/journal/types";
import { JournalCard } from "./journal-card";

interface JournalSectionProps {
  posts?: JournalPost[];
}

export function JournalSection({ posts = [] }: JournalSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [100, -100]);

  if (posts.length === 0) return null;

  return (
    <section
      id="journal"
      ref={sectionRef}
      className="relative bg-[#0a0a0a] py-32 md:py-48 overflow-hidden"
    >
      {/* Ambient warm wash */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.06) 0%, transparent 60%)",
          }}
        />
      </div>

      <motion.div className="relative z-10 text-center mb-20" style={{ y: titleY }}>
        <h2
          className="text-[15vw] md:text-[12vw] font-light tracking-tight leading-none select-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          JOURNAL
        </h2>
      </motion.div>

      <div className="relative z-10 px-6 md:px-12 lg:px-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {posts.map((post, index) => (
            <JournalCard key={post.slug} post={post} index={index} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Link
            href="/journal"
            className="group inline-flex items-center gap-3 border-b border-amber-500/40 pb-1 text-[12px] tracking-[0.22em] uppercase text-amber-400 transition-colors hover:text-amber-300 hover:border-amber-400"
          >
            All journal entries
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
