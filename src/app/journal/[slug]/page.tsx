import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalArticle } from "@/components/site/journal-article";
import { fetchJournalPost, fetchPublishedJournalSlugs } from "@/lib/journal/queries";
import type { JournalPost } from "@/lib/journal/types";
import { resolveMetadataImageUrl } from "@/lib/metadata/images";
import { SITE_URL } from "@/lib/seo/schema";

// Pre-render every published slug at build; unknown slugs ISR at request time.
// Daily safety-net window; the admin's on-demand revalidation (path + tag)
// propagates edits instantly, so the timer only matters if that call fails.
export const revalidate = 86400;
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

      <JournalArticle post={post} />

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org JSON-LD payload built from trusted Supabase rows.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
