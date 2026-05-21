import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { formatPhp, formatWatchMeta } from "@/lib/inventory/format";
import { fetchPublishedSlugs, fetchWatchBySlug } from "@/lib/inventory/queries";
import type { Watch } from "@/lib/inventory/types";

// ISR: every published slug is pre-rendered at build, unknown slugs fall
// through to on-demand render (dynamicParams defaults to true). Admin edits
// propagate within `revalidate` seconds without a redeploy.
export const revalidate = 60;
export const dynamicParams = true;

const MESSENGER_URL = "https://m.me/thewatchalley";

export async function generateStaticParams() {
  const slugs = await fetchPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const watch = await fetchWatchBySlug(slug);
  if (!watch) {
    return { title: "Watch not found — The Watch Alley PH" };
  }
  const title = `${watch.brand} ${watch.name} — The Watch Alley PH`;
  const description =
    watch.description ||
    `${watch.brand} ${watch.name}${watch.reference ? ` (${watch.reference})` : ""} — available at The Watch Alley.`;
  return {
    title,
    description,
    alternates: { canonical: `/watch/${watch.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/watch/${watch.slug}`,
      images: watch.primaryImage ? [{ url: watch.primaryImage }] : undefined,
    },
  };
}

function buildMailtoHref(watch: Watch): string {
  const subject = watch.inquirySubject || `Inquiry: ${watch.brand} ${watch.name}`;
  const body =
    watch.inquiryBody ||
    `Hi Watch Alley, I'm interested in the ${watch.brand} ${watch.name}${watch.reference ? ` (${watch.reference})` : ""}. Could you share current availability, condition photos, and included set details?`;
  return `mailto:hello@watchalley.ph?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildProductJsonLd(watch: Watch) {
  const availability =
    watch.status === "available"
      ? "https://schema.org/InStock"
      : watch.status === "reserved"
        ? "https://schema.org/Reserved"
        : "https://schema.org/SoldOut";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${watch.brand} ${watch.name}`,
    description: watch.description || undefined,
    image: watch.primaryImage || undefined,
    brand: { "@type": "Brand", name: watch.brand },
    sku: watch.reference || undefined,
    offers: {
      "@type": "Offer",
      price: watch.price,
      priceCurrency: watch.currency || "PHP",
      availability,
      url: `https://watchalley.ph/watch/${watch.slug}`,
    },
  };
}

function formatSoldMonth(soldAt: string): string {
  if (!/^\d{4}-\d{2}/.test(soldAt)) return "";
  const [year, month] = soldAt.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const idx = Math.max(0, Math.min(11, Number(month) - 1));
  return `${months[idx]} ${year}`;
}

function boxPapers(watch: Watch): string {
  if (watch.hasBox === true && watch.hasPapers === true) return "Box and papers";
  if (watch.hasBox === true) return "Box only";
  if (watch.hasPapers === true) return "Papers only";
  if (watch.set) return watch.set;
  return "Watch only";
}

export default async function WatchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const watch = await fetchWatchBySlug(slug);
  if (!watch) notFound();

  const isSold = watch.status === "sold";
  const isReserved = watch.status === "reserved";
  const meta = formatWatchMeta([watch.movement, watch.caseSize, watch.material]);
  const jsonLd = buildProductJsonLd(watch);

  return (
    <main className="bg-[#0a0a0a] text-zinc-100 pt-[clamp(120px,16vh,180px)] pb-32 px-6 md:px-12 lg:px-20 relative overflow-hidden">
      {/* Subtle amber wash anchored top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        <nav
          aria-label="Breadcrumb"
          className="mb-10 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500"
        >
          <Link href="/" className="hover:text-amber-400 transition-colors">
            Home
          </Link>
          <span className="px-2 text-zinc-700">·</span>
          <Link
            href={isSold ? "/sold" : "/available"}
            className="hover:text-amber-400 transition-colors"
          >
            {isSold ? "Sold" : "Available"}
          </Link>
          <span className="px-2 text-zinc-700">·</span>
          <span className="text-zinc-300">{watch.brand}</span>
        </nav>

        <article className="grid gap-10 lg:gap-16 lg:grid-cols-[1.2fr_1fr]">
          {/* Left — gallery */}
          <div className="flex flex-col gap-4">
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/30 ${isSold ? "[filter:grayscale(0.5)] opacity-95" : ""}`}
            >
              {watch.primaryImage && (
                <Image
                  src={watch.primaryImage}
                  alt={`${watch.brand} ${watch.name}`}
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                  priority
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              {watch.badge && !isSold && (
                <span className="absolute top-5 left-5 px-3 py-1.5 border border-amber-500/40 bg-black/40 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-amber-400">
                  {watch.badge}
                </span>
              )}
              {isSold && (
                <span className="absolute top-5 left-5 px-3 py-1.5 border border-white/20 bg-black/50 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-zinc-300">
                  Sold {watch.soldAt ? `· ${formatSoldMonth(watch.soldAt)}` : ""}
                </span>
              )}
            </div>
            {watch.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {watch.images.slice(0, 8).map((src) => (
                  <div
                    key={src}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-white/5"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — details */}
          <div className="flex flex-col gap-8">
            <header>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-px bg-amber-500/60" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/80">
                  {watch.brand}
                  {watch.reference && ` · ${watch.reference}`}
                </span>
              </div>
              <h1 className="font-serif text-[clamp(32px,4.5vw,56px)] leading-[1.05] text-zinc-100">
                {watch.name}
              </h1>
              {meta && (
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  {meta}
                </p>
              )}
            </header>

            <div className="flex flex-wrap items-baseline gap-4 border-y border-zinc-900/60 py-6">
              {isSold ? (
                <>
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                    ● Sold {watch.soldAt && ` · ${formatSoldMonth(watch.soldAt)}`}
                  </span>
                  {watch.soldPrice && (
                    <span className="font-serif text-3xl italic text-amber-500">
                      ₱ {watch.soldPrice.toLocaleString("en-PH")}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-serif text-[clamp(28px,3vw,40px)] text-amber-500">
                    {formatPhp(watch.price)}
                  </span>
                  <span
                    className="font-mono text-[11px] tracking-[0.2em] text-zinc-500"
                    data-price-php={watch.price}
                  />
                  {isReserved && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400">
                      · Reserved
                    </span>
                  )}
                </>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-y-5 gap-x-6 text-sm">
              {watch.conditionLabel && (
                <DetailRow label="Condition" value={watch.conditionLabel} />
              )}
              <DetailRow label="Set" value={boxPapers(watch)} />
              {watch.edition && <DetailRow label="Edition" value={watch.edition} />}
              {watch.movement && <DetailRow label="Movement" value={watch.movement} />}
              {watch.caseSize && <DetailRow label="Case" value={watch.caseSize} />}
              {watch.material && <DetailRow label="Material" value={watch.material} />}
              {watch.serviceHistory && (
                <DetailRow label="Service" value={watch.serviceHistory} />
              )}
            </dl>

            {watch.description && (
              <Section title="About this piece">
                <p>{watch.description}</p>
              </Section>
            )}

            {watch.provenance && (
              <Section title="Provenance">
                {watch.provenance.split(/\n{2,}/).map((p) => (
                  <p key={`${p.length}:${p.slice(0, 32)}`}>{p}</p>
                ))}
              </Section>
            )}

            {watch.disclosure && (
              <Section title="Disclosure">
                <p className="italic text-zinc-500">{watch.disclosure}</p>
              </Section>
            )}

            {!isSold && (
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <a
                  href={MESSENGER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 bg-amber-500 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-900 transition-colors hover:bg-amber-400"
                >
                  Message on Messenger
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M1 11L11 1M11 1H3M11 1V9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a
                  href={buildMailtoHref(watch)}
                  className="inline-flex items-center justify-center gap-3 border border-zinc-700 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                >
                  Email inquiry
                </a>
              </div>
            )}
            {isSold && (
              <Link
                href="/sold"
                className="mt-4 inline-flex items-center gap-2 self-start border-b border-amber-500/40 pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-amber-400 hover:text-amber-300 hover:border-amber-300 transition-colors"
              >
                <svg
                  className="w-3 h-3 rotate-180"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 11L11 1M11 1H3M11 1V9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to the Sold Archive
              </Link>
            )}
          </div>
        </article>
      </div>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org JSON-LD must be inlined; payload is server-built from trusted Supabase rows.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UsdPriceMount />
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/70">
        {label}
      </dt>
      <dd className="font-serif text-[15px] text-zinc-200">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-zinc-900/60 pt-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-px bg-amber-500/60" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/80">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-4 font-serif text-[16px] leading-[1.75] text-zinc-300">
        {children}
      </div>
    </section>
  );
}
