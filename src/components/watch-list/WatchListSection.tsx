import Link from "next/link";
import { WATCH_LIST_SUBHEADLINE } from "@/lib/watch-list/constants";
import { WatchListSignupForm } from "./WatchListSignupForm";

interface WatchListSectionProps {
  source?: string;
}

export function WatchListSection({ source = "homepage-watch-list" }: WatchListSectionProps) {
  return (
    <section className="relative overflow-hidden border-y border-amber-300/10 bg-[#0d0b08] px-6 py-20 text-cream md:px-12 md:py-28 lg:px-20">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "url(/brand/background-2.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(8,7,6,0.96),rgba(8,7,6,0.7)_55%,rgba(180,120,60,0.14))]" />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
            The Watch List
          </p>
          <h2 className="mt-5 max-w-3xl font-serif text-[clamp(40px,7vw,86px)] leading-[0.96] text-cream">
            First access, chosen with a collector's eye.
          </h2>
          <p className="mt-6 max-w-2xl text-[clamp(15px,1.6vw,18px)] leading-8 text-cream-60">
            {WATCH_LIST_SUBHEADLINE}
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-[11px] text-cream-60">
            {["Curated drops", "Rare finds", "Collector notes", "Sourcing opportunities"].map(
              (item) => (
                <span key={item} className="rounded-full border border-amber-300/15 px-3 py-2">
                  {item}
                </span>
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/15 bg-black/35 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur md:p-7">
          <WatchListSignupForm source={source} showPreferences defaultExpandedPreferences={false} />
          <Link
            href="/watch-list"
            className="mt-5 inline-flex border-b border-amber-300/30 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200 transition-colors hover:border-amber-200"
          >
            Open the full collector list
          </Link>
        </div>
      </div>
    </section>
  );
}
