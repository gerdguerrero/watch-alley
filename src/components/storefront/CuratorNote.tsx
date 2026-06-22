import Image from "next/image";
import { BigNum } from "./BigNum";
import { CuratorSignature } from "./CuratorSignature";
import { FilmGrain } from "./FilmGrain";

/**
 * Curator's Note - heritage atelier callout. Photo on the left, stacked
 * column on the right: big-num "06" above the eyebrow + headline + body +
 * italic signoff + CTA.
 *
 * Matches the e6419b3 reference layout. Server Component.
 */
export function CuratorNote() {
  return (
    <section
      id="curator-note"
      className="flex max-h-svh min-h-svh items-center border-b border-[color:var(--color-gold-20)] bg-background px-[clamp(20px,6vw,80px)] py-[clamp(40px,5vw,72px)]"
    >
      <div className="grid w-full gap-[clamp(28px,4vw,64px)] lg:grid-cols-2 lg:items-center">
        <figure className="relative mx-auto aspect-[4/3] w-full max-w-[540px] overflow-hidden border border-[color:var(--color-gold-20)] lg:aspect-[4/5] lg:max-h-[72svh] lg:max-w-none">
          <Image
            src="/watch-assets/alpinist.png"
            alt="Seiko Prospex Alpinist on a walnut bench at dusk, photographed in daylight, brass dial lit warm."
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
          <FilmGrain opacity={0.08} />
        </figure>

        <div className="flex flex-col gap-5">
          <BigNum>06</BigNum>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
            From the bench · This week
          </span>
          <h2 className="font-serif text-[clamp(36px,5vw,60px)] leading-[1.05] text-[color:var(--color-cream)]">
            A note from <em className="italic text-[color:var(--color-gold)]">the curator.</em>
          </h2>
          <p className="max-w-[56ch] font-sans text-[clamp(15px,1.3vw,17px)] leading-relaxed text-[color:var(--color-cream-80)]">
            This week we are carrying three pieces I would put on my own wrist, and one I almost did
            not list. The Alpinist "Whiskered Pitta" is the loudest of the four.
          </p>
          <blockquote className="my-1 border-l border-[color:var(--color-gold-30)] pl-5 font-serif text-[clamp(18px,1.8vw,22px)] italic leading-snug text-[color:var(--color-cream)]">
            It is also the one with the longest service history I have personally signed off on.
          </blockquote>
          <p className="max-w-[56ch] font-sans text-[clamp(15px,1.3vw,17px)] leading-relaxed text-[color:var(--color-cream-80)]">
            If you want to talk through any of them, message us on Messenger. We answer within four
            hours, Monday to Saturday.
          </p>
          <CuratorSignature />
          <a
            href="#arrivals"
            className="mt-2 inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-80)] transition-colors hover:text-[color:var(--color-gold)]"
          >
            See the current drop ↗
          </a>
        </div>
      </div>
    </section>
  );
}
