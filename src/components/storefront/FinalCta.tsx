/**
 * Full-width closing CTA — second invitation to message before the footer.
 *
 * Editorial: oversized italic headline, two clear channel buttons, single
 * reassurance line under them. Server Component.
 */
export function FinalCta() {
  return (
    <section
      id="cta"
      className="border-b border-[color:var(--color-gold-20)] bg-[color:var(--color-card)] px-[clamp(20px,6vw,80px)] py-[clamp(80px,10vw,160px)] text-center"
    >
      <span className="inline-block border border-[color:var(--color-gold-20)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
        ◆ 06 · Send a message
      </span>
      <h2 className="mt-6 font-serif text-[clamp(44px,9vw,112px)] leading-[0.95] tracking-[-0.02em] text-[color:var(--color-cream)]">
        Say hello.
        <br />
        <em className="italic text-[color:var(--color-gold)]">We'll reply.</em>
      </h2>
      <p className="mx-auto mt-8 max-w-[60ch] font-sans text-[clamp(15px,1.4vw,17px)] leading-[1.6] text-[color:var(--color-cream-80)]">
        Hunting a specific reference? Trading in? Curious about authentication? Pick a channel. A
        real person on the other side.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-5">
        <a
          href="https://m.me/TheWatchAlley"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 border border-[color:var(--color-gold)] bg-[color:var(--color-gold)] px-7 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-navy-deep)] transition-opacity hover:opacity-85"
        >
          <span aria-hidden="true">✦</span>
          <span>Message on Messenger</span>
          <span aria-hidden="true">↗</span>
        </a>
        <a
          href="mailto:hello@watchalley.ph"
          className="font-sans text-[15px] italic text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]"
        >
          or write to{" "}
          <span className="underline decoration-[color:var(--color-gold-30)] underline-offset-[5px]">
            hello@watchalley.ph
          </span>
        </a>
      </div>
      <div className="mt-6 font-sans text-[13px] italic text-[color:var(--color-cream-60)]">
        We usually reply within two hours.
      </div>
    </section>
  );
}
