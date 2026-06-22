import { BigNum } from "./BigNum";

/**
 * "How buying works" - 4-step educational flow. Browse → Inquire → Confirm
 * → Ship.
 *
 * Compact 2x2 grid sized to fit within a single viewport. Each step is a
 * compact card with italic Playfair numeral inset on the left, mono eyebrow
 * + Playfair name + Geist body on the right. Hairline-divided. Server
 * Component.
 */
const STEPS: ReadonlyArray<{
  num: string;
  eyebrow: string;
  name: string;
  copy: string;
}> = [
  {
    num: "01",
    eyebrow: "Browse",
    name: "Find the piece.",
    copy: "Open any watch on the homepage. Condition, photos, and disclosures up front.",
  },
  {
    num: "02",
    eyebrow: "Inquire",
    name: "Message us.",
    copy: "Tap Inquire to open a Messenger, IG, or email thread.",
  },
  {
    num: "03",
    eyebrow: "Confirm",
    name: "Reserve and pay.",
    copy: "Partial deposit or full payment via GCash or bank transfer.",
  },
  {
    num: "04",
    eyebrow: "Ship or meet",
    name: "Wrist on time.",
    copy: "Insured courier with tracking, or a meet-up in Metro Manila by appointment.",
  },
];

export function BuyingProcess() {
  return (
    <section
      id="buying-process"
      className="flex max-h-svh min-h-svh flex-col justify-center border-b border-[color:var(--color-gold-20)] bg-background px-[clamp(20px,6vw,80px)] py-[clamp(40px,5vw,72px)]"
    >
      <header className="mb-[clamp(24px,3vw,40px)] flex items-end gap-[clamp(16px,3vw,40px)]">
        <BigNum>05</BigNum>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
            ◆ How buying works
          </span>
          <h2 className="font-serif text-[clamp(28px,4vw,44px)] leading-tight text-[color:var(--color-cream)]">
            Browse{" "}
            <em className="italic text-[color:var(--color-gold)]">· Inquire · Confirm · Ship.</em>
          </h2>
          <p className="max-w-[60ch] font-sans text-[14px] leading-relaxed text-[color:var(--color-cream-80)]">
            No checkout cart. Real conversation, serviced piece on your wrist.
          </p>
        </div>
      </header>

      <ol className="grid grid-cols-1 gap-px bg-[color:var(--color-gold-20)] sm:grid-cols-2">
        {STEPS.map((step) => (
          <li
            key={step.num}
            className="grid grid-cols-[auto_1fr] items-baseline gap-5 bg-background p-[clamp(18px,2vw,28px)]"
          >
            <span
              className="select-none font-serif italic leading-[0.85] text-[color:var(--color-gold)] [font-variant-numeric:oldstyle-nums]"
              style={{ fontSize: "clamp(40px,5vw,72px)", opacity: 0.55 }}
              aria-hidden="true"
            >
              {step.num}
            </span>
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
                {step.eyebrow}
              </span>
              <span className="font-serif text-[clamp(18px,2vw,24px)] leading-tight text-[color:var(--color-cream)]">
                {step.name}
              </span>
              <p className="font-sans text-[13px] leading-snug text-[color:var(--color-cream-80)]">
                {step.copy}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
