import { FilmGrain } from "./FilmGrain";

/**
 * Inquiry band — paper-stock callout between the sold archive and the
 * dedicated contact section. Direct conversation pitch, not a feature card.
 *
 * Premium: the paper surface carries an SVG film-grain overlay at 0.04
 * opacity. Subtle, but reads as printed stock instead of a flat CSS color.
 *
 * Server Component.
 */
export function InquiryBand() {
  const messengerHref = "https://m.me/TheWatchAlley";

  return (
    <section
      id="messenger"
      className="relative overflow-hidden border-t border-border bg-paper px-[clamp(20px,4vw,80px)] py-[clamp(40px,7vw,72px)] text-ink-paper"
    >
      <FilmGrain opacity={0.05} />
      <div className="relative grid gap-[clamp(28px,5vw,72px)] lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-paper-soft">
            A note from the bench →
          </div>
          <h2 className="mt-3 max-w-[14ch] font-serif text-[clamp(34px,5vw,64px)] leading-[1.02] text-ink-paper">
            Ask before the next piece lands.
          </h2>
        </div>
        <div className="flex max-w-[68ch] flex-col justify-end">
          <p className="font-sans text-[clamp(16px,1.5vw,19px)] leading-[1.65]">
            Most watches move through direct conversation first. Message us
            for a condition follow-up, a piece you want held, or a reference
            you want us to watch for.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a
              href={messengerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center border border-ink-paper bg-ink-paper px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-90"
            >
              Message on Messenger ↗
            </a>
            <a
              href="mailto:hello@watchalley.ph"
              className="inline-flex min-h-11 items-center border-b border-ink-paper-soft/35 font-sans text-sm italic text-ink-paper-soft transition-colors hover:border-ink-paper"
            >
              hello@watchalley.ph
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
