"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { JournalPost } from "@/lib/journal/types";

interface JournalCardProps {
  post: JournalPost;
  index?: number;
}

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

function inferReadMinutes(post: JournalPost): number {
  if (post.readMinutes && post.readMinutes > 0) return post.readMinutes;
  const words = post.bodyMarkdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function JournalCard({ post, index = 0 }: JournalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.05, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={`/journal/${post.slug}`}
        className="group relative block bg-zinc-900/30 rounded-3xl overflow-hidden border border-white/5 hover:border-amber-500/30 transition-colors"
      >
        <div className="relative aspect-[5/4] overflow-hidden">
          {post.heroImage ? (
            <Image
              src={post.heroImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {post.tags[0] && (
            <span className="absolute top-5 left-5 px-3 py-1.5 border border-amber-500/40 bg-black/40 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-amber-400">
              {post.tags[0]}
            </span>
          )}
        </div>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-amber-500/60" />
            <span className="text-[10px] tracking-[0.3em] text-amber-500/80 uppercase font-mono">
              {formatDate(post.publishedAt)}
              {` · ${inferReadMinutes(post)} min`}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-serif text-white leading-tight mb-3">
            {post.title}
          </h3>
          {post.summary && (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-6">
              {post.summary}
            </p>
          )}
          <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-zinc-300 group-hover:text-amber-400 transition-colors">
            Read piece
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
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
