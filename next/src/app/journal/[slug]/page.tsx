import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MainNav } from "@/components/storefront/MainNav";
import { TopBar } from "@/components/storefront/TopBar";
import { renderMarkdown } from "@/lib/journal/markdown";
import { fetchJournalPost, fetchPublishedJournalSlugs } from "@/lib/journal/queries";
import type { JournalPost } from "@/lib/journal/types";

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
  if (!post) return { title: "Article not found — The Watch Alley PH" };
  return {
    title: `${post.title} — The Watch Alley PH`,
    description: post.summary,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: `/journal/${post.slug}`,
      images: post.heroImage ? [{ url: post.heroImage }] : undefined,
      publishedTime: post.publishedAt || undefined,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
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
        url: "https://watchalley.ph/logo.jpg",
      },
    },
    mainEntityOfPage: `https://watchalley.ph/journal/${post.slug}`,
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
    <>
      <TopBar />
      <MainNav active="journal" />
      <main className="flex-1">
        <article className="mx-auto max-w-[820px] px-[clamp(20px,4vw,80px)] py-[clamp(40px,6vw,80px)]">
          <Link
            href="/journal"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] transition-colors hover:text-[color:var(--color-gold)]"
          >
            ← Back to the Journal
          </Link>

          <header className="mt-8 border-b border-[color:var(--color-gold-20)] pb-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
              {(post.tags[0] || "Journal").toUpperCase()}
              {post.publishedAt && ` · ${formatDate(post.publishedAt)}`}
              {` · ${inferReadMinutes(post)} min read`}
            </div>
            <h1 className="mt-4 font-serif text-[clamp(32px,5vw,56px)] leading-[1.1] text-[color:var(--color-cream)]">
              {post.title}
            </h1>
            <p className="mt-4 font-sans text-lg italic leading-[1.55] text-[color:var(--color-cream-80)]">
              {post.summary}
            </p>
            <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
              By {post.author}
            </div>
          </header>

          {post.heroImage && (
            <figure className="my-10">
              <div className="relative aspect-[16/9] overflow-hidden border border-[color:var(--color-gold-20)]">
                <Image
                  src={post.heroImage}
                  alt={post.title}
                  fill
                  sizes="(min-width: 1024px) 820px, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
            </figure>
          )}

          <div
            className="article-body font-sans text-[17px] leading-[1.75] text-[color:var(--color-cream-80)]"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML produced by our own escape-safe renderMarkdown() — see lib/journal/markdown.ts. All untrusted text is HTML-escaped before any tag is emitted; URLs pass through a strict allowlist.
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </article>
      </main>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org JSON-LD payload built from trusted Supabase rows.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
