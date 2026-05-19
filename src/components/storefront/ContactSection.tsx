import { BgcMap } from "./BgcMap";
import { BigNum } from "./BigNum";

/**
 * Contact / Find Us section, sized to fit within a single viewport.
 *
 * Editorial address block + hours + map link. Trust through specificity
 * (concrete city, hours, reply window) without bloating the section.
 *
 * Server Component.
 */
const MAPS_URL =
  "https://maps.google.com/?q=The+Watch+Alley+BGC+Taguig+Manila";

export function ContactSection() {
  return (
    <section
      id="contact"
      className="flex max-h-svh min-h-svh flex-col justify-center border-b border-[color:var(--color-gold-20)] bg-background px-[clamp(20px,6vw,80px)] py-[clamp(32px,4vw,56px)]"
    >
      <header className="mb-[clamp(20px,2.5vw,32px)] flex items-end gap-[clamp(16px,3vw,40px)]">
        <BigNum>07</BigNum>
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
            ◆ Visit · By appointment
          </span>
          <h2 className="font-serif text-[clamp(24px,3.5vw,40px)] leading-tight text-[color:var(--color-cream)]">
            Find us in <em className="italic text-[color:var(--color-gold)]">Bonifacio Global City.</em>
          </h2>
        </div>
      </header>

      <div className="grid gap-[clamp(20px,3vw,48px)] lg:grid-cols-[1fr_1.4fr] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
              The Shop
            </div>
            <p className="mt-1.5 font-serif text-[clamp(20px,2.4vw,26px)] leading-tight text-[color:var(--color-cream)]">
              Bonifacio Global City
              <br />
              Taguig, Metro Manila
            </p>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 border-b border-[color:var(--color-gold-30)] pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-80)] transition-colors hover:border-[color:var(--color-gold)] hover:text-[color:var(--color-gold)]"
            >
              Open in Maps ↗
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-[color:var(--color-gold-20)] pt-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
                Hours
              </div>
              <p className="mt-1 font-sans text-[13px] leading-snug text-[color:var(--color-cream-80)]">
                By appointment.
                <br />
                Mon to Sat.
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
                Reply window
              </div>
              <p className="mt-1 font-sans text-[13px] leading-snug text-[color:var(--color-cream-80)]">
                Within four hours.
                <br />
                Mon to Sat.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--color-gold-20)] pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
                Status
              </span>
              <span className="font-serif text-[18px] leading-tight text-[color:var(--color-cream)]">
                Open for inquiries
              </span>
            </div>
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[color:var(--color-gold)]"
            />
          </div>
        </div>

        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open The Watch Alley location in Maps"
          className="group block aspect-[16/10] w-full overflow-hidden border border-[color:var(--color-gold-20)] transition-opacity hover:opacity-90 lg:aspect-auto lg:max-h-[58svh]"
        >
          <BgcMap />
        </a>
      </div>
    </section>
  );
}
