import Image from "next/image";
import Link from "next/link";
import { BigNum } from "@/components/storefront/BigNum";
import { FilmGrain } from "@/components/storefront/FilmGrain";
import { ScrollReveal } from "@/components/storefront/ScrollReveal";
import type { JournalPost } from "@/lib/journal/types";

interface JournalPreviewProps {
  posts: JournalPost[];
}

const MONTHS_LONG = [
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

function formatPublishedAt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthYear(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS_LONG[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getFullYear()}`;
}

function inferReadMinutes(post: JournalPost): number {
  const text = (post.summary || "").trim();
  if (!text) return 3;
  const words = text.split(/\s+/).length;
  return Math.max(2, Math.round(words / 80) + 2);
}

function MagazineMasthead({ issue, count }: { issue: string; count: number }) {
  return (
    <div className="relative mb-[clamp(20px,3vw,40px)] flex flex-wrap items-end justify-between gap-4 pb-[clamp(16px,2vw,24px)]">
      <span
        className="wa-rev-rise font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-cream-60)]"
        style={{ transitionDelay: "300ms" }}
      >
        The Watch Alley Journal · {issue}
      </span>
      <span
        className="wa-rev-rise font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-cream-60)] [font-variant-numeric:tabular-nums]"
        style={{ transitionDelay: "400ms" }}
      >
        {String(count).padStart(2, "0")} dispatches on file
      </span>
      {/* Hairline rule that draws left → right under the masthead text. */}
      <span
        aria-hidden="true"
        className="wa-rev-rule absolute bottom-0 left-0 right-0 h-px bg-[color:var(--color-gold-20)]"
      />
    </div>
  );
}

/**
 * Editorial magazine-spread section for the journal.
 *
 * Premium register: a masthead bar at the top reads the section as a real
 * publication, a 60/40 grid carries a film-grained featured story on the
 * left and a hairline-divided ledger of further entries on the right —
 * no card chrome, no rounded corners, no shadow. Byline + tabular date +
 * read-time stamp on every entry. Drop-cap leads the featured summary.
 *
 * All hover signals are slow gold rules drawing in from the left edge —
 * the same vocabulary the SoldRow component uses elsewhere.
 *
 * Server Component. Posts are passed in pre-fetched so the parent
 * decides what to show.
 */
export function JournalPreview({ posts }: JournalPreviewProps) {
  if (posts.length === 0) return null;
  const [featured, ...rest] = posts;
  const ledger = rest.slice(0, 3);

  return (
    <ScrollReveal>
      <section
        id="journal"
        className="border-t border-border bg-background px-[clamp(20px,4vw,80px)] py-[clamp(48px,8vw,96px)]"
      >
        {/* Section eyebrow row — BigNum + headline + VIEW ALL */}
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div
            className="wa-rev-rise flex items-end gap-[clamp(16px,3vw,40px)]"
            style={{ transitionDelay: "100ms" }}
          >
            <BigNum>02</BigNum>
            <div className="flex flex-col gap-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-gold)]">
                Dispatches
              </div>
              <h2 className="font-serif text-[clamp(32px,5vw,56px)] leading-tight text-[color:var(--color-cream)]">
                Notes from <em className="italic text-[color:var(--color-gold)]">the bench.</em>
              </h2>
            </div>
          </div>
          <Link
            href="/journal"
            style={{ transitionDelay: "200ms" }}
            className="wa-rev-rise group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] transition-colors hover:text-[color:var(--color-gold)]"
          >
            <span>View all</span>
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </header>

        <MagazineMasthead issue="Issue Nº 47 · April 2026" count={posts.length} />

        <div className="grid gap-[clamp(28px,3vw,48px)] lg:grid-cols-[1.4fr_1fr]">
          {/* Featured story — film-grained image, byline + drop-cap summary */}
          <Link
            href={`/journal/${featured.slug}`}
            style={{ transitionDelay: "500ms" }}
            className="wa-rev-rise group relative flex min-h-[420px] flex-col justify-end overflow-hidden border border-[color:var(--color-gold-20)] text-inherit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)] lg:min-h-[520px]"
          >
            {featured.heroImage && (
              <Image
                src={featured.heroImage}
                alt={featured.title}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover opacity-80 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
              />
            )}
            <FilmGrain opacity={0.07} />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(7,11,20,0) 0%, rgba(7,11,20,0.30) 45%, rgba(7,11,20,0.92) 100%)",
              }}
            />

            <div className="relative z-10 flex flex-col gap-3 p-[clamp(20px,3vw,40px)]">
              <span className="h-px w-12 bg-[color:var(--color-gold)] transition-all duration-700 ease-out group-hover:w-20" />
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-gold)] [font-variant-numeric:tabular-nums]">
                {featured.tags?.[0]?.toUpperCase() ?? "JOURNAL"}
                {featured.publishedAt && (
                  <>
                    <span className="mx-2 text-[color:var(--color-cream-60)]">·</span>
                    <span className="text-[color:var(--color-cream-60)]">
                      {formatPublishedAt(featured.publishedAt)}
                    </span>
                  </>
                )}
                <span className="mx-2 text-[color:var(--color-cream-60)]">·</span>
                <span className="text-[color:var(--color-cream-60)]">
                  {inferReadMinutes(featured)} min read
                </span>
              </span>
              <h3 className="font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.08] text-[color:var(--color-cream)]">
                {featured.title}
              </h3>
              <p className="max-w-[60ch] font-sans text-[clamp(14px,1.1vw,16px)] leading-relaxed text-[color:var(--color-cream-80)] [&::first-letter]:float-left [&::first-letter]:mr-2 [&::first-letter]:font-serif [&::first-letter]:text-[3em] [&::first-letter]:leading-[0.9] [&::first-letter]:text-[color:var(--color-gold)]">
                {featured.summary}
              </p>
              <span className="mt-2 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-80)] transition-colors group-hover:text-[color:var(--color-gold)]">
                <span>Continue reading</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          </Link>

          {/* Right column — hairline ledger. No card chrome. */}
          <ol className="flex flex-col">
            {ledger.map((post, i) => (
              <li
                key={post.slug}
                style={{ transitionDelay: `${600 + i * 120}ms` }}
                className="wa-rev-rise relative border-t border-[color:var(--color-gold-20)] last:border-b"
              >
                <Link
                  href={`/journal/${post.slug}`}
                  className="group relative grid grid-cols-[auto_1fr_auto] items-baseline gap-[clamp(12px,2vw,24px)] py-[clamp(20px,2.5vw,32px)] text-inherit transition-colors hover:bg-[color:oklch(0.76_0.12_75_/_0.04)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--color-gold)]"
                >
                  {/* Gold rule slide-in marker on hover/focus */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-1/2 h-[60%] w-px -translate-y-1/2 origin-center scale-y-0 bg-[color:var(--color-gold)] transition-transform duration-700 ease-out group-hover:scale-y-100 group-focus-visible:scale-y-100"
                  />

                  <span className="select-none font-serif italic text-[clamp(28px,2.6vw,36px)] leading-none text-[color:var(--color-gold)] opacity-50 [font-variant-numeric:oldstyle-nums]">
                    {String(i + 2).padStart(2, "0")}
                  </span>

                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-gold)] [font-variant-numeric:tabular-nums]">
                      {post.tags?.[0]?.toUpperCase() ?? "JOURNAL"}
                      <span className="mx-2 text-[color:var(--color-cream-60)]">·</span>
                      <span className="text-[color:var(--color-cream-60)]">
                        {inferReadMinutes(post)} min read
                      </span>
                    </span>
                    <span className="font-serif text-[clamp(18px,1.6vw,22px)] leading-tight text-[color:var(--color-cream)] transition-colors group-hover:text-[color:var(--color-gold)]">
                      {post.title}
                    </span>
                    <span className="line-clamp-2 font-sans text-[13px] leading-snug text-[color:var(--color-cream-60)]">
                      {post.summary}
                    </span>
                  </div>

                  <span className="self-start whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)] [font-variant-numeric:tabular-nums]">
                    {formatMonthYear(post.publishedAt ?? "")}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </ScrollReveal>
  );
}
