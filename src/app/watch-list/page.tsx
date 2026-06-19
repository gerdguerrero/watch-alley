import type { Metadata } from "next";
import Link from "next/link";
import { SourcingRequestForm } from "@/components/watch-list/SourcingRequestForm";
import { WatchListSignupForm } from "@/components/watch-list/WatchListSignupForm";
import { WATCH_LIST_POSITIONING } from "@/lib/watch-list/constants";

export const metadata: Metadata = {
  title: "The Watch List — The Watch Alley PH",
  description:
    "First access to curated drops, rare finds, collector notes, and sourcing opportunities from Manila.",
  alternates: { canonical: "/watch-list" },
};

export default function WatchListPage() {
  return (
    <main className="bg-[#080706] pt-[clamp(92px,10vh,124px)] text-cream">
      <section className="relative overflow-hidden px-6 pb-20 pt-12 md:px-12 md:pb-28 lg:px-20">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "url(/brand/background-3.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,7,6,0.98),rgba(8,7,6,0.74)_58%,rgba(245,158,11,0.16))]" />

        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
              The Watch List by The Watch Alley
            </p>
            <h1 className="mt-5 max-w-4xl font-serif text-[clamp(48px,8vw,104px)] leading-[0.92] text-cream">
              First access from Manila's collecting desk.
            </h1>
            <p className="mt-7 max-w-2xl text-[clamp(16px,1.7vw,20px)] leading-8 text-cream-60">
              {WATCH_LIST_POSITIONING}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                ["Curated drops", "Available pieces before they get buried in the feed."],
                ["Rare finds", "Alerts for references that do not sit around for long."],
                ["Collector notes", "A tighter read on condition, provenance, and taste."],
                ["Sourcing", "A structured way to tell us what to hunt for next."],
              ].map(([title, body]) => (
                <div key={title} className="border-t border-amber-300/15 pt-4">
                  <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-cream-60">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/15 bg-black/35 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur md:p-7">
            <h2 className="font-serif text-3xl leading-tight text-cream">Join The Watch List</h2>
            <p className="mt-3 text-sm leading-6 text-cream-60">
              Share the broad shape of what catches your eye. You can keep it light or give us a
              proper brief.
            </p>
            <div className="mt-6">
              <WatchListSignupForm source="watch-list-page" showPreferences />
            </div>
          </div>
        </div>
      </section>

      <section
        id="sourcing"
        className="border-t border-amber-300/10 px-6 py-20 md:px-12 md:py-28 lg:px-20"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
              Private Collecting Desk
            </p>
            <h2 className="mt-5 font-serif text-[clamp(36px,5vw,70px)] leading-[0.98] text-cream">
              Looking for a specific reference?
            </h2>
            <p className="mt-6 text-[15px] leading-7 text-cream-60">
              Send a structured request with your budget, timing, condition preference, and the
              details that matter. The brief becomes part of the sourcing pipeline.
            </p>
            <Link
              href="/sold"
              className="mt-8 inline-flex border-b border-amber-300/30 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200 transition-colors hover:border-amber-200"
            >
              Browse the sold archive
            </Link>
          </div>

          <div className="rounded-2xl border border-amber-300/15 bg-black/30 p-5 md:p-7">
            <SourcingRequestForm source="watch-list-page-sourcing" />
          </div>
        </div>
      </section>
    </main>
  );
}
