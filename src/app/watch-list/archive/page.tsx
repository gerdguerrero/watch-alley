import type { Metadata } from "next";
import Link from "next/link";
import { fetchNewsletterIssues } from "@/lib/newsletter/queries";

export const metadata: Metadata = {
  title: "Watch List Archive",
  description: "Past Watch List dispatches from The Watch Alley.",
  alternates: { canonical: "/watch-list/archive" },
};

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function WatchListArchivePage() {
  const issues = await fetchNewsletterIssues();

  return (
    <main className="bg-[#080706] px-6 pb-24 pt-[clamp(100px,12vh,140px)] text-cream md:px-12 lg:px-20">
      <section className="mx-auto max-w-5xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
          The Watch List Archive
        </p>
        <h1 className="mt-5 font-serif text-[clamp(44px,7vw,88px)] leading-[0.95]">
          Dispatches worth revisiting.
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-7 text-cream-60">
          Public Watch List issues will appear here after they are sent and marked visible by an
          admin.
        </p>

        <div className="mt-12 grid gap-4">
          {issues.length === 0 ? (
            <div className="border border-amber-300/15 bg-black/25 p-6 text-sm leading-7 text-cream-60">
              No public issues yet. Join The Watch List for first access while the archive builds.
            </div>
          ) : (
            issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/watch-list/archive/${issue.slug}`}
                className="group border border-amber-300/15 bg-black/25 p-5 transition-colors hover:border-amber-300/45"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/70">
                  {formatDate(issue.sentAt) || "The Watch List"}
                </div>
                <h2 className="mt-3 font-serif text-2xl leading-tight text-cream">
                  {issue.publicTitle}
                </h2>
                {issue.preheader && (
                  <p className="mt-2 text-sm leading-6 text-cream-60">{issue.preheader}</p>
                )}
                <span className="mt-4 inline-flex font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200">
                  Read issue
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
