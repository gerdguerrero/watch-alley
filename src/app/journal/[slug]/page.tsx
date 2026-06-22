import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@/lib/journal/markdown";
import { fetchJournalPost, fetchPublishedJournalSlugs } from "@/lib/journal/queries";
import type { JournalPost } from "@/lib/journal/types";
import { resolveMetadataImageUrl } from "@/lib/metadata/images";
import { SITE_URL } from "@/lib/seo/schema";

// Pre-render every published slug at build; unknown slugs ISR at request time.
// 60s revalidate so admin edits propagate within a minute.
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await fetchPublishedJournalSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchJournalPost(slug);
  if (!post) return { title: "Article not found" };
  const imageUrl = resolveMetadataImageUrl(post.heroImage);
  const image = imageUrl ? [{ url: imageUrl, alt: post.title }] : undefined;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: `${SITE_URL}/journal/${post.slug}`,
      images: image,
      publishedTime: post.publishedAt || undefined,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

function formatDate(iso: string): string {
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

function inferReadMinutes(post: JournalPost): number {
  if (post.readMinutes && post.readMinutes > 0) return post.readMinutes;
  const words = post.bodyMarkdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function buildArticleJsonLd(post: JournalPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    image: post.heroImage || undefined,
    datePublished: post.publishedAt || undefined,
    author: { "@type": "Organization", name: post.author || "The Watch Alley" },
    publisher: {
      "@type": "Organization",
      name: "The Watch Alley",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/brand/logo-dp-flat.png`,
      },
    },
    mainEntityOfPage: `${SITE_URL}/journal/${post.slug}`,
    keywords: post.tags.join(", "),
  };
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchJournalPost(slug);
  if (!post) notFound();

  const bodyHtml = renderMarkdown(post.bodyMarkdown);
  const jsonLd = buildArticleJsonLd(post);

  return (
    <main className="bg-[#080706] text-zinc-100 pt-[clamp(120px,16vh,180px)] pb-32 px-6 md:px-12 lg:px-20">
      {/* Subtle amber wash anchored at top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.05) 0%, transparent 60%)",
        }}
      />

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
              {post.publishedAt && ` · ${formatDate(post.publishedAt)}`}
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
          // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML produced by our own escape-safe renderMarkdown() — see lib/journal/markdown.ts.
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

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org JSON-LD payload built from trusted Supabase rows.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
