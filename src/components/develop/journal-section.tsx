"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
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

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  if (posts.length === 0) return null;

  const featured = posts[0];
  const supporting = posts.slice(1, 4);
  const featuredTitle = splitTitle(featured.title);

  return (
    <section
      id="journal"
      ref={sectionRef}
      className="relative bg-[#080706] py-32 md:py-48 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.06] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundTwo})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080706] via-transparent to-[#080706]" />
      {/* Subtle ambient gradient */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(circle at center, rgba(245, 158, 11, 0.03) 0%, transparent 50%)",
        }}
      />

      {/* Ghost title */}
      <div className="absolute top-24 left-0 right-0 text-center pointer-events-none">
        <h2
          className="text-[18vw] md:text-[14vw] font-light tracking-tight leading-none select-none"
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
      </div>

      <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-32 md:pt-48">
        <div className="max-w-7xl mx-auto">
          {/* Sub-label */}
          <motion.div
            className="flex items-center gap-4 mb-16 md:mb-20"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <div className="w-12 h-px bg-amber-500/60" />
            <span className="text-[11px] tracking-[0.3em] text-amber-500/80 uppercase font-mono">
              Latest Insights
            </span>
          </motion.div>

          {/* Featured — 70/30 asymmetric */}
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-10 lg:gap-16 items-center mb-24 md:mb-32">
            {/* Image */}
            <motion.div
              className="relative"
              style={{ y: imageY }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 1 }}
            >
              <Link
                href={`/journal/${featured.slug}`}
                className="relative aspect-[4/3] rounded-3xl overflow-hidden group block"
              >
                <Image
                  src={postImage(featured, 0)}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </Link>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="text-[11px] tracking-[0.3em] text-amber-300/80 uppercase font-mono">
                  {featured.tags[0] || "Journal"}
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-[11px] tracking-[0.2em] text-zinc-600 uppercase font-mono">
                  {formatDate(featured.publishedAt)}
                </span>
              </div>

              <Link href={`/journal/${featured.slug}`} className="block group">
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-serif text-cream leading-[1.1] mb-6 transition-colors group-hover:text-amber-300">
                  <span className="italic">{featuredTitle.lead}</span>{" "}
                  {featuredTitle.rest && (
                    <span className="text-cream-60 font-light">{featuredTitle.rest}</span>
                  )}
                </h3>
              </Link>

              {featured.summary && (
                <p className="text-base text-cream-60 leading-relaxed mb-10 max-w-md line-clamp-2">
                  {featured.summary}
                </p>
              )}

              <Link
                href={`/journal/${featured.slug}`}
                className="group inline-flex items-center gap-4"
              >
                <span className="text-[12px] tracking-[0.2em] uppercase text-cream transition-transform group-hover:translate-x-2 duration-300">
                  Read Story
                </span>
                <div className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-500/10 transition-all duration-300">
                  <svg
                    className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 transition-colors"
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
            </motion.div>
          </div>

          {/* Supporting grid */}
          {supporting.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {supporting.map((post, i) => (
                <motion.article
                  key={post.slug}
                  className="group"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.7, delay: i * 0.1 }}
                >
                  <Link href={`/journal/${post.slug}`} className="block">
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-5">
                      <Image
                        src={postImage(post, i + 1)}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-500" />
                    </div>

                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="text-[10px] tracking-[0.25em] text-amber-300/80 uppercase font-mono">
                        {post.tags[0] || "Journal"}
                      </span>
                      <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                      <span className="text-[10px] tracking-[0.2em] text-cream-60 uppercase font-mono">
                        {formatDate(post.publishedAt)}
                      </span>
                    </div>
                    <h4 className="text-xl md:text-2xl font-serif font-light text-cream leading-[1.2] group-hover:text-amber-300 transition-colors duration-300">
                      {post.title}
                    </h4>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}

          {/* All entries link */}
          <div className="mt-20 flex justify-center">
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
      </div>
    </section>
  );
}
