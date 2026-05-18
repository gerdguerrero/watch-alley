export function InquiryBand() {
  const inquiryHref =
    "mailto:hello@watchalley.ph?subject=Join%20the%20Viber%20drop%20list&body=Hi%20Watch%20Alley,%20please%20send%20me%20the%20Viber%20community%20link%20and%20next%20drop%20details.";

  return (
    <section
      id="contact"
      className="border-t border-border bg-paper px-[clamp(20px,4vw,80px)] py-[clamp(40px,7vw,72px)] text-ink-paper"
    >
      <div id="viber" className="grid gap-[clamp(28px,5vw,72px)] lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-paper-soft">
            Viber drops · Manila desk
          </div>
          <h2 className="mt-3 max-w-[12ch] font-serif text-[clamp(34px,5vw,64px)] leading-[1.02] text-ink-paper">
            Ask before the next piece lands.
          </h2>
        </div>
        <div className="flex max-w-[68ch] flex-col justify-end">
          <p className="font-sans text-[clamp(16px,1.5vw,19px)] leading-[1.65]">
            Most watches move through direct conversation first. Send a note for the Viber community
            link, a condition follow-up, or a reference you want us to watch for.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a
              href={inquiryHref}
              className="inline-flex min-h-11 items-center border border-ink-paper bg-ink-paper px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper transition-opacity hover:opacity-90"
            >
              Request Viber link
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
