import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageTitle } from "@/components/develop/page-title";
import { BRAND_ASSETS } from "@/lib/brand/assets";

export const metadata: Metadata = {
  title: "Heritage & Curation — The Watch Alley PH",
  description:
    "Honest provenance, daylight-photographed disclosures, and our absolute lifetime Authenticity Promise. The story of The Watch Alley boutique in Manila.",
  alternates: { canonical: "/heritage" },
};

export default function HeritagePage() {
  return (
    <main className="bg-[#080706] text-zinc-100 min-h-screen">
      <PageTitle
        showHorologicalLogo={true}
        eyebrow="◆ Our Curation Standard"
        description="A Manila boutique created from a personal, collector-first desire: to build a quiet space for transparent watch conversations, daylight-photographed disclosures, and patient curation."
      />

      {/* Main sections container */}
      <section className="relative px-6 md:px-12 lg:px-20 pb-32 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 gap-16 md:gap-24">
          
          {/* Section 1: The Boutique Story */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-amber-500/60" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/80">
                  Our Roots in Manila
                </span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-cream font-light">
                A sanctuary for patient watch conversations.
              </h2>
              <div className="font-sans text-[16px] md:text-[17px] leading-[1.85] text-zinc-300/90 space-y-4">
                <p>
                  The Watch Alley was born from a simple, shared frustration: the high-pressure, transactional nature of the modern watch market. We wanted to build something different—a physical boutique and digital library where collectors could discuss mechanics, design, and history without pretense or stress.
                </p>
                <p>
                  Located in the heart of Manila, our boutique operates on a coffee-over-watches concierge standard. We do not engage in artificial scarcity or aggressive sales cycles. Instead, we host a curated rotation of pre-owned modern classics, neo-vintage gems, and brand-new references that we personally stand behind.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-5 relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/5 bg-zinc-950 shadow-2xl">
              <Image
                src={BRAND_ASSETS.coverPhoto}
                alt="The Watch Alley storefront boutique"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover opacity-90 transition-transform duration-700 hover:scale-102"
              />
            </div>
          </div>

          {/* Section 2: Daylight Curation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            <div className="lg:col-span-5 lg:order-last space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-amber-500/60" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/80">
                  Daylight Curation Philosophy
                </span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-cream font-light">
                Truth captures best under natural light.
              </h2>
              <div className="font-sans text-[16px] md:text-[17px] leading-[1.85] text-zinc-300/90 space-y-4">
                <p>
                  Renderings and heavy studio box-lights hide the honest wear, the tiny scratches, and the authentic dial color of a vintage or pre-owned timepiece. We believe that true character deserves absolute exposure.
                </p>
                <p>
                  Every watch presented by The Watch Alley is photographed exclusively in natural daylight, with macro lenses that capture the actual condition. What you see is exactly what will be placed in your hands. We document and disclose every single nuance, strap crease, bezel tick, and patina change in writing.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-7 relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-white/5 bg-zinc-950 shadow-2xl">
              <Image
                src={BRAND_ASSETS.socialMockup}
                alt="Macro watch dial detailing under natural daylight"
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover opacity-85 transition-transform duration-700 hover:scale-102"
              />
            </div>
          </div>

          {/* Section 3: Curation & Authenticity Promise */}
          <div id="authenticity" className="relative p-8 md:p-12 rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-zinc-950 via-zinc-900/60 to-zinc-950 shadow-2xl overflow-hidden">
            {/* Background wash inside the card */}
            <div
              aria-hidden="true"
              className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl pointer-events-none"
            />
            
            <div className="max-w-3xl space-y-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-amber-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400 font-semibold">
                  Absolute Curation Standard
                </span>
              </div>
              
              <h2 className="font-serif text-3.5xl md:text-5xl text-cream font-light leading-tight">
                Our Lifetime <br />
                <span className="text-amber-400 italic">Authenticity Promise</span>
              </h2>
              
              <p className="font-sans text-[17px] md:text-[18px] leading-[1.85] text-zinc-200">
                At The Watch Alley, authenticity is not an open question; it is our foundation. We recognize that acquiring a luxury timepiece is a significant commitment. Every watch listed on our platform undergoes a meticulous, double-inspection process before it is cataloged:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-mono text-sm">01 /</span>
                    <h3 className="font-serif text-xl text-cream font-medium">Internal Movement Curation</h3>
                  </div>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    Our master watchmakers test and measure each movement&apos;s amplitude, beat error, and chronometric accuracy on a precision timegrapher. Internals are audited to verify that every component matches correct specifications.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-mono text-sm">02 /</span>
                    <h3 className="font-serif text-xl text-cream font-medium">External Provenance Audit</h3>
                  </div>
                  <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                    Case geometries, engravings, serial number logs, reference bezel markers, and signatures are cross-referenced with manufacturer databases to certify original factory production parameters.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h4 className="font-serif text-lg text-cream font-medium">Lifetime Authenticity Guarantee</h4>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    Every piece sold is backed by a full, unconditional lifetime financial guarantee. If any watch is ever proven to be non-original, a full refund is immediately processed.
                  </p>
                </div>
                
                <Link
                  href="/available"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/30 px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-amber-200 bg-amber-400/5 transition-colors hover:border-amber-300/70 hover:bg-amber-300 hover:text-[#080706] flex-shrink-0"
                >
                  Browse Collection
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
