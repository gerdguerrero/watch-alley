import Image from "next/image";
import Link from "next/link";
import type { JournalPost } from "@/lib/journal/types";

interface JournalPreviewProps {
  posts: JournalPost[];
}

function formatPublishedAt(iso: string): string {
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

/**
 * Editorial "From the Journal" homepage section — replaces the homepage Sold
 * Archive slot per the 2026-05 client feedback. Featured post on the left,
 * three stack cards on the right.
 *
 * Server Component. Posts are passed in already-fetched so the parent can
 * fetch once and decide what to show.
 */
export function JournalPreview({ posts }: JournalPreviewProps) {
  if (posts.length === 0) return null;
  const [featured, ...rest] = posts;
  const stack = rest.slice(0, 3);

  return (
    <section
      id="journal"
      className="border-t border-border bg-background px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,96px)]"
    >
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
            From the Journal
          </div>
          <h2 className="mt-2 font-serif text-[clamp(32px,5vw,48px)] leading-tight text-[color:var(--color-cream)]">
            Notes from <em className="italic text-[color:var(--color-gold)]">the bench.</em>
          </h2>
        </div>
        <Link
          href="/journal"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] transition-colors hover:text-[color:var(--color-gold)]"
        >
          VIEW ALL →
        </Link>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Link
          href={`/journal/${featured.slug}`}
          className="group relative flex h-full min-h-[360px] flex-col justify-end overflow-hidden border border-[color:var(--color-gold-20)] text-inherit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)]"
        >
          {featured.heroImage && (
            <Image
              src={featured.heroImage}
              alt={featured.title}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover opacity-70 transition-opacity group-hover:opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="relative z-10 max-w-[60ch] p-[clamp(20px,3vw,32px)]">
            <span className="inline-block border border-[color:var(--color-gold-20)] bg-background/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
              ★ {featured.tags[0]?.toUpperCase() ?? "JOURNAL"}
            </span>
            <h3 className="mt-4 font-serif text-[clamp(24px,3vw,36px)] leading-tight text-[color:var(--color-cream)]">
              {featured.title}
            </h3>
            <p className="mt-3 line-clamp-3 font-sans text-sm leading-relaxed text-[color:var(--color-cream-80)]">
              {featured.summary}
            </p>
            <span className="mt-4 inline-block border border-[color:var(--color-gold)] bg-[color:var(--color-gold)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-navy-deep)]">
              Read more →
            </span>
          </div>
        </Link>

        <div className="flex flex-col gap-4">
          {stack.map((post, i) => (
            <Link
              key={post.slug}
              href={`/journal/${post.slug}`}
              className="group flex items-start gap-4 border border-[color:var(--color-gold-20)] bg-[color:var(--color-card)] p-5 text-inherit transition-colors hover:border-[color:var(--color-gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)]"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden">
                {post.heroImage && (
                  <Image src={post.heroImage} alt="" fill sizes="80px" className="object-cover" />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
                  Nº 0{i + 2} · {post.tags[0]?.toUpperCase() ?? "JOURNAL"}
                </div>
                <div className="font-serif text-base leading-tight text-[color:var(--color-cream)] group-hover:text-[color:var(--color-gold)]">
                  {post.title}
                </div>
                <div className="line-clamp-2 font-sans text-xs leading-relaxed text-[color:var(--color-cream-60)]">
                  {post.summary}
                </div>
                {post.publishedAt && (
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
                    {formatPublishedAt(post.publishedAt)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
