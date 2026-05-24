"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import type { JournalPost } from "@/lib/journal/types";

const MotionLink = motion.create(Link);

interface HeritageSectionProps {
  latestPost?: JournalPost | null;
  inventorySize?: number;
  soldSize?: number;
}

export function HeritageSection({
  latestPost = null,
  inventorySize,
  soldSize,
}: HeritageSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const stats = [
    {
      value: typeof inventorySize === "number" ? `${inventorySize}` : "50+",
      label: "Available Now",
    },
    {
      value: typeof soldSize === "number" ? `${soldSize}+` : "200+",
      label: "Pieces Placed",
    },
  ];

  return (
    <section
      id="heritage"
      ref={sectionRef}
      className="relative overflow-hidden bg-walnut-deep lg:h-screen lg:min-h-[750px] lg:max-h-[900px] flex flex-col justify-center py-16 lg:py-0"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.07] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundThree})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(245,158,11,0.08),transparent_42%)]" />

      {/* Unified Editorial Section Title */}
      <div className="relative z-10 text-center mb-10 lg:mb-12">
        <span className="text-[10px] tracking-[0.3em] text-amber-300/80 uppercase font-mono block mb-2">
          ◆ Our Standard
        </span>
        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream font-light tracking-tight uppercase">
          Heritage
        </h2>
        <p className="font-serif italic text-sm text-cream-60 mt-2">
          Honest provenance. Collected with care.
        </p>
      </div>

      <div className="relative z-10 px-6 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="relative lg:col-span-6 w-full flex justify-center lg:justify-end">
              <div className="group relative aspect-[4/3] w-full max-w-lg max-h-[280px] lg:max-h-[340px] overflow-hidden rounded-[2rem] border border-amber-400/10 bg-walnut-deep/30 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
                <Image
                  src={BRAND_ASSETS.coverPhoto}
                  alt="The Watch Alley storefront signage and boutique frontage"
                  fill
                  className="object-cover opacity-90 transition-transform duration-1000 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-walnut-deep/70 via-walnut-deep/20 to-transparent" />
                <div className="absolute right-6 bottom-6 left-6 rounded-2xl border border-white/10 bg-walnut-deep/45 p-4 backdrop-blur-md md:right-auto md:max-w-xs">
                  <span className="mb-1 block text-[9px] uppercase tracking-[0.3em] text-amber-300/80 font-mono">
                    Manila-based curator
                  </span>
                  <span className="block font-serif text-lg leading-tight text-cream">
                    A quiet alley for serious watch conversations.
                  </span>
                </div>
              </div>

              <motion.div
                className="absolute -right-4 -bottom-6 hidden aspect-square w-32 overflow-hidden rounded-[1.5rem] border border-amber-400/10 bg-walnut-deep shadow-2xl md:right-10 md:block md:w-36"
                initial={{ opacity: 0, scale: 0.86 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25, duration: 0.8 }}
              >
                <Image
                  src={BRAND_ASSETS.socialMockup}
                  alt="The Watch Alley brand mark beside a close-up watch dial"
                  fill
                  className="object-cover"
                  sizes="256px"
                />
              </motion.div>
            </div>

            <div className="lg:col-span-6 lg:pl-6 max-w-xl">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8 }}
              >
                <div className="mb-6 font-serif text-sm leading-relaxed text-cream-80 space-y-4">
                  <p className="italic text-amber-300/90 font-light">Dear fellow collector,</p>
                  <p>
                    We believe that timepieces aren&apos;t just instruments; they are stories we
                    carry. The Watch Alley was founded from a simple, personal desire: to create a
                    quiet space for transparent, patient watch conversations in Manila. No
                    high-pressure sales pitches, no scarcity. Just pieces we love, disclosed in
                    writing.
                  </p>
                  <p className="text-[13px] text-cream-60 font-sans leading-relaxed">
                    Every watch we source is daylight-photographed to capture its true character,
                    and handed over personally. Whether we meet over a coffee or ship fully insured,
                    you receive a piece handled with collector restraint.
                  </p>
                </div>

                <div className="flex gap-10 border-t border-amber-400/10 pt-6 md:gap-12">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.55 + i * 0.1, duration: 0.6 }}
                    >
                      <span
                        className="mb-1 block font-serif text-3xl text-cream md:text-4xl [font-variant-numeric:oldstyle-nums] tabular-nums"
                        style={{ fontVariantNumeric: "oldstyle-nums" }}
                      >
                        {stat.value}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-cream-60">
                        {stat.label}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <MotionLink
                    href="/authenticity"
                    className="group inline-flex items-center justify-center rounded-full border border-amber-300/30 px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-amber-200 transition-colors hover:border-amber-300/70 hover:bg-amber-300 hover:text-walnut-deep"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    Authenticity Promise
                  </MotionLink>
                  <MotionLink
                    href={latestPost ? `/journal/${latestPost.slug}` : "/journal"}
                    className="group inline-flex items-center justify-center gap-3 px-2 py-3 text-[11px] uppercase tracking-[0.2em] text-cream transition-colors hover:text-amber-200"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span>{latestPost ? "Latest Journal" : "Read the Journal"}</span>
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M1 11L11 1M11 1H3M11 1V9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </MotionLink>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
