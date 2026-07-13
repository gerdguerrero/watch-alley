import Image from "next/image";
import Link from "next/link";
import { renderMarkdown } from "@/lib/journal/markdown";
import type { JournalPost } from "@/lib/journal/types";

/**
 * Shared journal article body - rendered by /journal/[slug] (published) and
 * /journal/preview/[id] (signed draft preview) so a draft previews exactly
 * as it will publish. Server Component; no client logic.
 */

export function formatJournalDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function inferReadMinutes(post: JournalPost): number {
  if (post.readMinutes && post.readMinutes > 0) return post.readMinutes;
  const words = post.bodyMarkdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function JournalArticle({ post }: { post: JournalPost }) {
  const bodyHtml = renderMarkdown(post.bodyMarkdown);

  return (
    <article className="relative mx-auto max-w-[820px]">
      <Link
        href="/journal"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 hover:text-amber-400 transition-colors"
      >
        <svg className="w-3 h-3 rotate-180" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M1 11L11 1M11 1H3M11 1V9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to the Journal
      </Link>

      <header className="mt-10 mb-12 border-b border-zinc-900/60 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-px bg-amber-500/60" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/80">
            {(post.tags[0] || "Journal").toUpperCase()}
            {post.publishedAt && ` · ${formatJournalDate(post.publishedAt)}`}
            {` · ${inferReadMinutes(post)} min read`}
          </span>
        </div>
        <h1 className="font-serif text-[clamp(36px,5.5vw,64px)] leading-[1.05] text-zinc-100 mb-6">
          {post.title}
        </h1>
        {post.summary && (
          <p className="font-serif text-lg md:text-xl italic leading-[1.55] text-zinc-400 max-w-[60ch]">
            {post.summary}
          </p>
        )}
        <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          By {post.author}
        </div>
      </header>

      {post.heroImage && (
        <figure className="mb-14">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/5">
            <Image
              src={post.heroImage}
              alt={post.title}
              fill
              sizes="(min-width: 1024px) 820px, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        </figure>
      )}

      <div
        className="article-body font-sans text-[16px] md:text-[17px] leading-[1.85] text-zinc-300/95 tracking-wide font-normal"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML produced by our own escape-safe renderMarkdown() - see lib/journal/markdown.ts.
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <div className="mt-16 pt-10 border-t border-zinc-900/60 flex flex-wrap items-center justify-between gap-6">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <svg className="w-3 h-3 rotate-180" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M1 11L11 1M11 1H3M11 1V9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          All entries
        </Link>
        <Link
          href="/available"
          className="group inline-flex items-center gap-2 border-b border-amber-500/40 pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-amber-400 hover:text-amber-300 hover:border-amber-300 transition-colors"
        >
          See available pieces
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
    </article>
  );
}
