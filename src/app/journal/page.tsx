import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/storefront/MainNav";
import { TopBar } from "@/components/storefront/TopBar";
import { fetchJournalPosts } from "@/lib/journal/queries";
import type { JournalPost } from "@/lib/journal/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Journal — The Watch Alley PH",
  description:
    "Notes from the bench: dispatches on watches we love, market observations from Manila, and a slow-build collector library from The Watch Alley.",
  alternates: { canonical: "/journal" },
};

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

export default async function JournalIndexPage() {
  const posts = await fetchJournalPosts();

  return (
    <>
      <TopBar />
      <MainNav active="journal" />
      <main className="mx-auto flex-1 px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,120px)]">
        <header className="mb-[clamp(36px,5vw,72px)] max-w-3xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
            Issue Nº 47 · April 2026
          </div>
          <h1 className="mt-3 font-serif text-[clamp(40px,6vw,72px)] font-medium leading-[1.05] text-[color:var(--color-cream)]">
            Notes from <em className="italic text-[color:var(--color-gold)]">the bench.</em>
          </h1>
          <p className="mt-4 max-w-[60ch] font-sans text-base leading-[1.65] text-[color:var(--color-cream-80)]">
            A slow-build collector library: dispatches on watches we love, market observations from
            Manila, and the conversations we keep having with buyers. New entries land when there is
            something honestly worth saying, not on a content calendar.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="font-sans italic text-[color:var(--color-cream-60)]">
            No published entries yet. Check back soon.
          </p>
        ) : (
          <ol className="flex flex-col border-t border-[color:var(--color-gold-20)]">
            {posts.map((post, i) => (
              <li key={post.slug}>
                <Link
                  href={`/journal/${post.slug}`}
                  className="group grid grid-cols-[clamp(64px,12vw,110px)_1fr_auto] items-baseline gap-[clamp(16px,3vw,36px)] border-b border-[color:var(--color-gold-20)] py-[clamp(22px,3vw,32px)] text-inherit transition-colors hover:bg-[rgba(201,162,75,0.05)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)]"
                >
                  <span className="font-serif text-[clamp(28px,3vw,40px)] italic leading-none text-[color:var(--color-gold)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
                      {(post.tags[0] || "Journal").toUpperCase()}
                      {post.publishedAt && ` · ${formatDate(post.publishedAt)}`}
                      {` · ${inferReadMinutes(post)} min read`}
                    </span>
                    <h2 className="font-serif text-[clamp(22px,2.4vw,30px)] leading-[1.2] text-[color:var(--color-cream)] group-hover:text-[color:var(--color-gold)]">
                      {post.title}
                    </h2>
                    <p className="max-w-[64ch] font-sans text-sm leading-[1.55] text-[color:var(--color-cream-80)]">
                      {post.summary}
                    </p>
                  </div>
                  <span className="hidden self-center font-mono text-base text-[color:var(--color-gold)] sm:inline">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
