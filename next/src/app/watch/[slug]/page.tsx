import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  fetchWatchBySlug,
  fetchPublishedSlugs,
} from "@/lib/inventory/queries";
import { formatPhp, formatWatchMeta } from "@/lib/inventory/format";
import { TopBar } from "@/components/storefront/TopBar";
import { MainNav } from "@/components/storefront/MainNav";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import type { Watch } from "@/lib/inventory/types";

// ISR: every published slug is pre-rendered at build, unknown slugs fall
// through to on-demand render (dynamicParams defaults to true). Admin edits
// propagate within `revalidate` seconds without a redeploy.
export const revalidate = 60;
export const dynamicParams = true;

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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
    <>
      <TopBar />
      <MainNav />
      <main className="flex-1 px-[clamp(20px,4vw,80px)] py-[clamp(40px,6vw,80px)]">
        <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
          <Link href="/" className="hover:text-[color:var(--color-gold)]">
            Home
          </Link>
          <span className="px-2">·</span>
          <Link href="/available" className="hover:text-[color:var(--color-gold)]">
            Available
          </Link>
          <span className="px-2">·</span>
          <span className="text-[color:var(--color-cream)]">{watch.brand}</span>
        </nav>

        <article className="grid gap-[clamp(28px,4vw,56px)] lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className={`relative aspect-[4/3] overflow-hidden border border-[color:var(--color-gold-20)] bg-[color:var(--color-card)] ${isSold ? "[filter:grayscale(0.5)] opacity-90" : ""}`}>
              {watch.primaryImage ? (
                <Image
                  src={watch.primaryImage}
                  alt={`${watch.brand} ${watch.name}`}
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                  priority
                />
              ) : null}
              {watch.badge && (
                <span className="absolute left-4 top-4 border border-[color:var(--color-gold-20)] bg-background/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
                  {watch.badge}
                </span>
              )}
            </div>
            {watch.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {watch.images.slice(0, 8).map((src, i) => (
                  <div
                    key={src + i}
                    className="relative aspect-square overflow-hidden border border-[color:var(--color-gold-20)]"
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

          <div className="flex flex-col gap-6">
            <header>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
                {watch.brand}
                {watch.reference && ` · ${watch.reference}`}
              </div>
              <h1 className="mt-3 font-serif text-[clamp(28px,3.8vw,44px)] leading-tight text-[color:var(--color-cream)]">
                {watch.name}
              </h1>
              {meta && (
                <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
                  {meta}
                </div>
              )}
            </header>

            <div className="flex flex-wrap items-baseline gap-4 border-y border-[color:var(--color-gold-20)] py-5">
              {isSold ? (
                <>
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-60)]">
                    ● Sold
                    {watch.soldAt && ` · ${formatSoldMonth(watch.soldAt)}`}
                  </span>
                  {watch.soldPrice && (
                    <span className="font-serif text-2xl italic text-[color:var(--color-gold)]">
                      ₱ {watch.soldPrice.toLocaleString("en-PH")}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-serif text-[clamp(28px,3vw,36px)] text-[color:var(--color-gold)]">
                    {formatPhp(watch.price)}
                  </span>
                  <span
                    className="font-mono text-[11px] font-normal tracking-[0.2em] text-[color:var(--color-cream-60)]"
                    data-price-php={watch.price}
                  />
                  {isReserved && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
                      · Reserved
                    </span>
                  )}
                </>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-y-4 text-sm">
              {watch.conditionLabel && (
                <DetailRow label="Condition" value={watch.conditionLabel} />
              )}
              <DetailRow label="Set" value={boxPapers(watch)} />
              {watch.edition && (
                <DetailRow label="Edition" value={watch.edition} />
              )}
              {watch.movement && (
                <DetailRow label="Movement" value={watch.movement} />
              )}
              {watch.caseSize && <DetailRow label="Case" value={watch.caseSize} />}
              {watch.material && (
                <DetailRow label="Material" value={watch.material} />
              )}
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
                {watch.provenance.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </Section>
            )}

            {watch.disclosure && (
              <Section title="Disclosure">
                <p className="italic text-[color:var(--color-cream-60)]">
                  {watch.disclosure}
                </p>
              </Section>
            )}

            {!isSold && (
              <a
                href={buildMailtoHref(watch)}
                className="mt-2 inline-flex items-center justify-center gap-2 border border-[color:var(--color-gold)] bg-[color:var(--color-gold)] px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-navy-deep)] transition-opacity hover:opacity-85"
              >
                Inquire about this piece ↗
              </a>
            )}
            {isSold && (
              <Link
                href="/sold"
                className="mt-2 inline-block self-start border-b border-[color:var(--color-gold-30)] pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-cream-80)] hover:border-[color:var(--color-gold)] hover:text-[color:var(--color-gold)]"
              >
                ← Back to the Sold Archive
              </Link>
            )}
          </div>
        </article>
      </main>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org JSON-LD must be inlined; payload is server-built from trusted Supabase rows.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UsdPriceMount />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-cream-60)]">
        {label}
      </dt>
      <dd className="font-sans text-[color:var(--color-cream)]">{value}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-[color:var(--color-gold-20)] pt-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-gold)]">
        {title}
      </h2>
      <div className="flex flex-col gap-3 font-sans text-[15px] leading-[1.7] text-[color:var(--color-cream-80)]">
        {children}
      </div>
    </section>
  );
}
