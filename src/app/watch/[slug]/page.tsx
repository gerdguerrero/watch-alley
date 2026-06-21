import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { InquiryButtons } from "@/components/storefront/InquiryButtons";
import { UsdPriceMount } from "@/components/storefront/UsdPriceMount";
import { WatchViewTracker } from "@/components/storefront/WatchViewTracker";
import { WatchGallery } from "@/components/storefront/WatchGallery";
import { WatchAlertForm } from "@/components/watch-list/WatchAlertForm";
import { formatBadge, formatCategory, formatPhp } from "@/lib/inventory/format";
import { fetchPublishedSlugs, fetchWatchBySlug } from "@/lib/inventory/queries";
import type { Watch } from "@/lib/inventory/types";
import { resolveMetadataImageUrl } from "@/lib/metadata/images";

// ISR: every published slug is pre-rendered at build, unknown slugs fall
// through to on-demand render (dynamicParams defaults to true). Admin edits
// propagate within `revalidate` seconds without a redeploy.
export const revalidate = 60;
export const dynamicParams = true;

interface DetailItem {
  label: string;
  value: string;
}

function isDetailItem(item: DetailItem | null): item is DetailItem {
  return item !== null;
}

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
  const imageUrl = resolveMetadataImageUrl(watch.primaryImage);
  const image = imageUrl ? [{ url: imageUrl, alt: `${watch.brand} ${watch.name}` }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/watch/${watch.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/watch/${watch.slug}`,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

function buildProductJsonLd(watch: Watch) {
  const availability =
    watch.status === "available"
      ? "https://schema.org/InStock"
      : watch.status === "reserved"
        ? "https://schema.org/LimitedAvailability"
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
      url: `https://thewatchalley.com/watch/${watch.slug}`,
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLeadingBrand(brand: string, name: string): string {
  const stripped = name.replace(new RegExp(`^${escapeRegExp(brand)}\\s+`, "i"), "").trim();
  return stripped || name;
}

function buildDetailItems(watch: Watch): DetailItem[] {
  return [
    watch.conditionLabel ? { label: "Condition", value: watch.conditionLabel } : null,
    { label: "Set", value: boxPapers(watch) },
    watch.edition ? { label: "Edition", value: watch.edition } : null,
    watch.movement ? { label: "Movement", value: watch.movement } : null,
    watch.caseSize ? { label: "Case", value: watch.caseSize } : null,
    watch.material ? { label: "Material", value: watch.material } : null,
    watch.serviceHistory ? { label: "Service", value: watch.serviceHistory } : null,
  ].filter(isDetailItem);
}

export default async function WatchDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const watch = await fetchWatchBySlug(slug);
  if (!watch) notFound();

  const isSold = watch.status === "sold";
  const isReserved = watch.status === "reserved";
  const jsonLd = buildProductJsonLd(watch);
  const displayName = stripLeadingBrand(watch.brand, watch.name);
  const detailItems = buildDetailItems(watch);

  return (
    <main className="relative flex min-h-[100svh] flex-col overflow-x-clip bg-[#080706] px-5 pb-6 pt-[clamp(86px,9vh,112px)] text-zinc-100 md:px-8 lg:px-12 xl:px-16">
      {/* Subtle amber wash anchored top */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-full max-w-4xl -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1500px] lg:my-auto">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500"
        >
          <Link href="/" className="transition-colors hover:text-amber-400">
            Home
          </Link>
          <span className="px-2 text-zinc-700">·</span>
          <Link
            href={isSold ? "/sold" : "/available"}
            className="transition-colors hover:text-amber-400"
          >
            {isSold ? "Sold" : "Available"}
          </Link>
          <span className="px-2 text-zinc-700">·</span>
          <span className="text-zinc-300">{watch.brand}</span>
        </nav>

        {/* Amazon-style three-column PDP: gallery (auto) · fluid details ·
            sticky buy-box rail. The middle column soaks up extra width on
            large monitors; the buy box stays pinned while the details scroll. */}
        <article className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(300px,330px)] lg:items-start lg:gap-8 xl:gap-10">
          {/* Col 1 — Gallery (specs now live in the buy box, so the image fills) */}
          <WatchGallery
            images={
              watch.images.length > 0
                ? watch.images
                : watch.primaryImage
                  ? [watch.primaryImage]
                  : []
            }
            alt={`${watch.brand} ${watch.name}`}
            badge={watch.badge}
            soldAt={watch.soldAt ? formatSoldMonth(watch.soldAt) : undefined}
            isSold={isSold}
            isReserved={isReserved}
          />

          {/* Col 2 — Details: title + story */}
          <div className="flex min-w-0 flex-col gap-4">
            <header>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="h-px w-6 bg-amber-500/60" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/80">
                  {watch.brand}
                  {watch.reference && ` · ${watch.reference}`}
                </span>
                {watch.category && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-400">
                    {formatCategory(watch.category)}
                  </span>
                )}
                {watch.badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-zinc-700 bg-zinc-800/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-400"
                  >
                    {formatBadge(b)}
                  </span>
                ))}
              </div>
              <h1 className="font-serif text-[clamp(24px,2.1vw,34px)] leading-[1.05] text-zinc-100">
                {displayName}
              </h1>
            </header>

            {watch.description && (
              <CompactSection title="About this piece">
                {renderTextBlocks(watch.description)}
              </CompactSection>
            )}

            {watch.provenance && (
              <CompactSection title="Provenance">
                {renderTextBlocks(watch.provenance)}
              </CompactSection>
            )}

            {watch.disclosure && (
              <CompactSection title="Disclosure">
                <p className="text-zinc-500">{watch.disclosure}</p>
              </CompactSection>
            )}

            {isSold && (
              <Link
                href="/sold"
                className="inline-flex items-center gap-2 self-start border-b border-amber-500/40 pb-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-amber-400 transition-colors hover:border-amber-300 hover:text-amber-300"
              >
                <svg
                  className="h-3 w-3 rotate-180"
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

          {/* Col 3 — Sticky buy box */}
          <aside className="lg:sticky lg:top-[100px] lg:self-start">
            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/60 to-zinc-950/40 p-5">
              <div>
                {isSold ? (
                  <>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                      ● Sold{watch.soldAt && ` · ${formatSoldMonth(watch.soldAt)}`}
                    </div>
                    {watch.soldPrice && (
                      <div className="mt-1 font-sans text-[clamp(26px,2.4vw,32px)] font-semibold text-amber-500">
                        ₱ {watch.soldPrice.toLocaleString("en-PH")}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-sans text-[clamp(28px,2.6vw,36px)] font-semibold leading-none text-amber-500">
                        {formatPhp(watch.price)}
                      </span>
                      {isReserved && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400">
                          Reserved
                        </span>
                      )}
                    </div>
                    <span
                      className="mt-1 block font-mono text-[11px] tracking-[0.2em] text-zinc-500"
                      data-price-php={watch.price}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em]">
                <span
                  className={
                    isSold ? "text-zinc-500" : isReserved ? "text-amber-400" : "text-emerald-400"
                  }
                >
                  {isSold ? "● Sold" : isReserved ? "● Reserved" : "● Available"}
                </span>
              </div>

              {!isSold && <InquiryButtons watch={watch} title={`${watch.brand} ${displayName}`} />}

              {isSold && (
                <WatchAlertForm
                  watchId={watch.id}
                  watchSlug={watch.slug}
                  watchTitle={`${watch.brand} ${displayName}`}
                  brand={watch.brand}
                  reference={watch.reference}
                />
              )}

              {isReserved && (
                <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 font-sans text-[12px] leading-5 text-amber-100/85">
                  This piece is currently on reserve. You can still message us to be next in line if
                  the reservation is released.
                </p>
              )}

              {detailItems.length > 0 && (
                <dl className="flex flex-col divide-y divide-zinc-800/60 border-t border-zinc-800/60 pt-1">
                  {detailItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-baseline justify-between gap-3 py-2"
                    >
                      <dt className="shrink-0 font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-500">
                        {item.label}
                      </dt>
                      <dd className="text-right font-sans text-[12px] leading-snug text-zinc-200">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </aside>
        </article>
      </div>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Schema.org JSON-LD must be inlined; payload is server-built from trusted Supabase rows.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UsdPriceMount />
      <WatchViewTracker slug={slug} />
    </main>
  );
}

function CompactSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-900/80 bg-zinc-950/25 p-4">
      <div className="flex items-center gap-2">
        <div className="h-px w-5 bg-amber-500/60" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/80">
          {title}
        </h2>
      </div>
      <div className="mt-2 flex flex-col gap-2 font-sans text-[13px] leading-5 text-zinc-300">
        {children}
      </div>
    </section>
  );
}

function renderTextBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const isList = lines.length > 1 && lines.every((line) => /^[-•]\s+/.test(line));

      if (isList) {
        return (
          <ul key={block} className="list-disc space-y-1 pl-5">
            {lines.map((line) => (
              <li key={line}>{line.replace(/^[-•]\s+/, "")}</li>
            ))}
          </ul>
        );
      }

      return (
        <p key={block}>
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      );
    });
}
