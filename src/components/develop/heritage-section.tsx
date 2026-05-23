"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
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

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [90, -90]);
  const textY = useTransform(scrollYProgress, [0, 1], [45, -45]);

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
      className="relative overflow-hidden bg-[#080706] py-32 md:py-48"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.07] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundThree})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(245,158,11,0.08),transparent_42%)]" />

      {/* Large ghost title */}
      <div className="pointer-events-none absolute top-24 left-0 right-0 text-center">
        <h2
          className="select-none text-[18vw] font-light leading-none tracking-tight md:text-[14vw]"
          style={{
            background:
              "linear-gradient(180deg, rgba(250, 250, 249, 0.46) 0%, rgba(250, 250, 249, 0.14) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          HERITAGE
        </h2>
      </div>

      <div className="relative z-10 px-6 pt-32 md:px-12 md:pt-48 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
            <motion.div className="relative lg:col-span-7" style={{ y: imageY }}>
              <div className="group relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-amber-400/10 bg-black/30 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
                <Image
                  src={BRAND_ASSETS.coverPhoto}
                  alt="The Watch Alley storefront signage and boutique frontage"
                  fill
                  className="object-cover opacity-90 transition-transform duration-1000 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute right-6 bottom-6 left-6 rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-md md:right-auto md:max-w-sm">
                  <span className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-mono">
                    Manila-based curator
                  </span>
                  <span className="block font-serif text-2xl leading-tight text-cream md:text-3xl">
                    A quiet alley for serious watch conversations.
                  </span>
                </div>
              </div>

              <motion.div
                className="absolute -right-4 -bottom-14 hidden aspect-square w-48 overflow-hidden rounded-[1.5rem] border border-amber-400/10 bg-black shadow-2xl md:right-10 md:block md:w-64"
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
            </motion.div>

            <motion.div className="lg:col-span-5 lg:pl-10" style={{ y: textY }}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8 }}
              >
                <div className="mb-8 flex items-center gap-4">
                  <div className="h-px w-12 bg-amber-300/70" />
                  <span className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80 font-mono">
                    Our Standard
                  </span>
                </div>

                <h2 className="mb-8 font-serif text-4xl leading-[1.08] text-cream md:text-5xl lg:text-6xl">
                  <span className="italic">Honest</span>{" "}
                  <span className="font-light text-cream-60">watch dealing,</span>
                  <br />
                  <span className="font-light text-cream-60">styled with</span>{" "}
                  <span className="italic">restraint.</span>
                </h2>

                <p className="mb-6 max-w-md text-base leading-relaxed text-cream-80">
                  The Watch Alley pairs a collector&apos;s eye with a polished, human buying
                  experience: clear photos, written disclosure, fair conversation, and careful
                  handoff.
                </p>

                <p className="mb-12 max-w-md text-sm leading-relaxed text-cream-60">
                  The brand system from the Drive refresh — black, warm gold, textured watch
                  photography, and the compass-hand mark — now anchors the storefront as a boutique
                  rather than a catalog.
                </p>

                <div className="flex gap-10 border-t border-amber-400/10 pt-8 md:gap-12">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.55 + i * 0.1, duration: 0.6 }}
                    >
                      <span className="mb-2 block font-serif text-4xl text-cream md:text-5xl">
                        {stat.value}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-cream-60">
                        {stat.label}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                  <MotionLink
                    href="/authenticity"
                    className="group inline-flex items-center justify-center rounded-full border border-amber-300/30 px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-amber-200 transition-colors hover:border-amber-300/70 hover:bg-amber-300 hover:text-[#090806]"
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
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
