"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import type { JournalPost } from "@/lib/journal/types";

interface JournalSectionProps {
  posts?: JournalPost[];
}

const FALLBACK_IMAGES = [
  "/journal/article-1.jpg",
  "/journal/article-2.jpg",
  "/journal/article-3.jpg",
  "/journal/article-4.jpg",
];

function formatDate(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function splitTitle(title: string): { lead: string; rest: string } {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2) return { lead: title, rest: "" };
  return {
    lead: words.slice(0, 2).join(" "),
    rest: words.slice(2).join(" "),
  };
}

function postImage(post: JournalPost, fallbackIndex: number): string {
  if (post.heroImage) return post.heroImage;
  return FALLBACK_IMAGES[fallbackIndex] ?? FALLBACK_IMAGES[0];
}

export function JournalSection({ posts = [] }: JournalSectionProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  if (posts.length === 0) return null;

  const featured = posts[0];
  const featuredTitle = splitTitle(featured.title);

  return (
    <section
      id="journal"
      ref={sectionRef}
      className="relative -mt-16 flex flex-col justify-center overflow-hidden bg-walnut-deep py-20 md:-mt-20 md:py-24 lg:-mt-28 lg:min-h-[760px] lg:pt-36 lg:pb-24 xl:-mt-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.06] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundTwo})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-walnut-deep via-transparent to-walnut-deep" />
      {/* Subtle ambient gradient */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle at center, rgba(245, 158, 11, 0.03) 0%, transparent 50%)",
        }}
      />

      {/* Unified Editorial Section Title */}
      <div className="relative z-10 text-center mb-10 lg:mb-12">
        <span className="text-[10px] tracking-[0.3em] text-amber-500/80 uppercase font-mono block mb-2">
          ◆ Notes from the Bench
        </span>
        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream font-light tracking-tight uppercase">
          Journal
        </h2>
        <p className="font-serif italic text-sm text-cream-60 mt-2">
          Dispatches on Sourcing and Craft.
        </p>
      </div>

      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1680px] mx-auto">
          {/* Featured - Balanced 50/50 top-aligned layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Image */}
            <motion.div
              className="relative w-full flex justify-center lg:justify-end"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 1 }}
            >
              <Link
                href={`/journal/${featured.slug}`}
                className="relative aspect-[4/3] w-full max-w-lg max-h-[280px] lg:max-h-[340px] rounded-3xl overflow-hidden group block border border-amber-400/10 bg-walnut-deep/30 shadow-[0_30px_90px_rgba(0,0,0,0.4)]"
              >
                <Image
                  src={postImage(featured, 0)}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-walnut-deep/40 via-transparent to-transparent" />
              </Link>
            </motion.div>

            {/* Content */}
            <motion.div
              className="lg:pl-4 max-w-xl"
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-[11px] tracking-[0.3em] text-amber-300/80 uppercase font-mono">
                  {featured.tags[0] || "Journal"}
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-[11px] tracking-[0.2em] text-zinc-600 uppercase font-mono">
                  {formatDate(featured.publishedAt)}
                </span>
              </div>

              <Link href={`/journal/${featured.slug}`} className="block group">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif text-cream leading-[1.15] mb-5 transition-colors group-hover:text-amber-300">
                  <span className="italic font-normal text-amber-300/90">{featuredTitle.lead}</span>{" "}
                  {featuredTitle.rest && (
                    <span className="text-cream-60 font-light">{featuredTitle.rest}</span>
                  )}
                </h3>
              </Link>

              {featured.summary && (
                <p className="text-sm text-cream-60 leading-relaxed mb-8 line-clamp-3">
                  {featured.summary}
                </p>
              )}

              <div className="flex items-center gap-6">
                <Link
                  href={`/journal/${featured.slug}`}
                  className="group inline-flex items-center gap-3"
                >
                  <span className="text-[11px] tracking-[0.2em] uppercase text-cream transition-transform group-hover:translate-x-2 duration-300">
                    Read Story
                  </span>
                  <div className="w-8 h-8 rounded-full border border-amber-400/20 flex items-center justify-center group-hover:border-amber-300/50 group-hover:bg-amber-300/10 transition-all duration-300">
                    <svg
                      className="w-3 h-3 text-zinc-400 group-hover:text-amber-500 transition-colors"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8H13M13 8L8 3M13 8L8 13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </Link>

                <Link
                  href="/journal"
                  className="group inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-cream-60 hover:text-amber-300 transition-colors"
                >
                  <span>All Dispatches</span>
                  <svg
                    className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
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
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
