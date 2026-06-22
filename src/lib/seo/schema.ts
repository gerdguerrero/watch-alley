import { BRAND_ASSETS } from "@/lib/brand/assets";
import type { Watch } from "@/lib/inventory/types";

export const SITE_URL = "https://www.thewatchalley.com";
export const SITE_NAME = "The Watch Alley";
export const SITE_TITLE = "The Watch Alley PH | Curated Watches in Manila";
export const SITE_DESCRIPTION =
  "Shop curated pre-owned, brand-new, and limited-edition watches in Manila with daylight photos, written condition notes, and direct collector concierge.";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function cleanText(value: string | null | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function watchTitle(watch: Watch): string {
  return `${watch.brand} ${watch.name}`.replace(/\s+/g, " ").trim();
}

function watchAvailability(watch: Watch): string {
  if (watch.status === "available") return "https://schema.org/InStock";
  if (watch.status === "reserved") return "https://schema.org/LimitedAvailability";
  return "https://schema.org/SoldOut";
}

export function buildSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        alternateName: ["The Watch Alley PH", "Watch Alley"],
        url: SITE_URL,
        logo: absoluteUrl(BRAND_ASSETS.logoOnBlack),
        image: absoluteUrl(BRAND_ASSETS.coverPhoto),
        sameAs: [
          "https://www.facebook.com/TheWatchAlley",
          "https://www.instagram.com/the.watch.alley/",
          "https://www.tiktok.com/@the.watch.alley.ph",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: "The Watch Alley PH",
        url: SITE_URL,
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export function buildProductJsonLd(watch: Watch) {
  const title = watchTitle(watch);
  const image = [watch.primaryImage, ...watch.images]
    .map((url) => cleanText(url))
    .filter((url): url is string => Boolean(url))
    .map(absoluteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/watch/${watch.slug}#product`,
    name: title,
    description: cleanText(watch.description) ?? `${title} from The Watch Alley.`,
    image: image.length > 0 ? image : undefined,
    brand: { "@type": "Brand", name: watch.brand },
    sku: cleanText(watch.reference) ?? watch.slug,
    category: cleanText(watch.category ?? undefined),
    itemCondition: watch.conditionLabel
      ? `https://schema.org/${
          watch.conditionLabel.toLowerCase().includes("new") ? "NewCondition" : "UsedCondition"
        }`
      : undefined,
    offers: {
      "@type": "Offer",
      price: watch.price,
      priceCurrency: watch.currency || "PHP",
      availability: watchAvailability(watch),
      url: `${SITE_URL}/watch/${watch.slug}`,
      seller: { "@id": ORGANIZATION_ID },
    },
  };
}

export function buildAvailableItemListJsonLd(watches: Watch[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Available watches from The Watch Alley",
    url: `${SITE_URL}/available`,
    numberOfItems: watches.length,
    itemListElement: watches.slice(0, 24).map((watch, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/watch/${watch.slug}`,
      name: watchTitle(watch),
      image: watch.primaryImage ? absoluteUrl(watch.primaryImage) : undefined,
    })),
  };
}
