import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchNewsletterIssueBySlug } from "@/lib/newsletter/queries";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchNewsletterIssueBySlug(slug);
  if (!data) return { title: "Issue not found — The Watch Alley PH" };

  return {
    title: `${data.issue.publicTitle} — The Watch List`,
    description: data.issue.preheader || data.issue.subject,
    alternates: { canonical: `/watch-list/archive/${slug}` },
  };
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function WatchListIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchNewsletterIssueBySlug(slug);
  if (!data) notFound();

  const { issue, items } = data;

  return (
    <main className="bg-[#080706] px-6 pb-24 pt-[clamp(100px,12vh,140px)] text-cream md:px-12 lg:px-20">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/watch-list/archive"
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80 transition-colors hover:text-amber-200"
        >
          Back to archive
        </Link>

        <header className="mt-8 border-b border-amber-300/15 pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
            {formatDate(issue.sentAt) || "The Watch List"}
          </p>
          <h1 className="mt-5 font-serif text-[clamp(40px,7vw,82px)] leading-[0.95]">
            {issue.publicTitle}
          </h1>
          {issue.preheader && (
            <p className="mt-6 text-[16px] leading-8 text-cream-60">{issue.preheader}</p>
          )}
        </header>

        {issue.introHtml && (
          <div
            className="mt-10 text-[16px] leading-8 text-cream-80"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Newsletter issue HTML is admin-authored and only public after admin archive approval.
            dangerouslySetInnerHTML={{ __html: issue.introHtml }}
          />
        )}

        {items.length > 0 && (
          <div className="mt-10 grid gap-4">
            {items.map((item) => (
              <section key={item.id} className="border border-amber-300/15 bg-black/25 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/70">
                  {item.itemType.replaceAll("_", " ")}
                </p>
                <h2 className="mt-3 font-serif text-2xl leading-tight">{item.title}</h2>
                {item.summary && (
                  <p className="mt-2 text-sm leading-6 text-cream-60">{item.summary}</p>
                )}
                {item.url && (
                  <Link
                    href={item.url}
                    className="mt-4 inline-flex border-b border-amber-300/30 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200"
                  >
                    Open
                  </Link>
                )}
              </section>
            ))}
          </div>
        )}

        {issue.bodyHtml && (
          <div
            className="article-body mt-12 text-cream-80"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Newsletter issue HTML is admin-authored and only public after admin archive approval.
            dangerouslySetInnerHTML={{ __html: issue.bodyHtml }}
          />
        )}

        <footer className="mt-12 border-t border-amber-300/15 pt-8">
          <Link
            href="/watch-list"
            className="inline-flex rounded-xl bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806]"
          >
            Join The Watch List
          </Link>
        </footer>
      </article>
    </main>
  );
}
