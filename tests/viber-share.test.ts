import { describe, expect, it } from "vitest";
import {
  buildViberFullMessage,
  buildViberSharePayload,
  LEGACY_VIBER_URI_BUDGET,
  savedPublicWatchForViber,
} from "../public/scripts/lib/viber-share.mjs";

const publishedWatch = {
  id: "twa-220",
  slug: "breitling-colt-chronometre-36mm-divers-watch-ref-a7438911bd82",
  name: "Breitling Colt Chronometre 36mm Divers Watch",
  brand: "Breitling",
  model: "Colt Chronometre",
  reference: "A7438911/BD82",
  price: 69_800,
  conditionLabel: "Pre-owned 8.8-9/10",
  inclusionSet: "Complete set",
  description: [
    "Pre-owned",
    "Breitling Colt - Chronometre",
    "36mm Divers Watch - Ref. A7438911/BD82",
    "",
    "Php 69,800",
    "- complete set",
    "- 8.8-9/10 condition",
    "",
    "Discontinued Model",
  ].join("\n"),
  status: "available",
};

const shortUrl = "https://www.thewatchalley.com/w/twa-220";
const canonicalUrl =
  "https://www.thewatchalley.com/watch/breitling-colt-chronometre-36mm-divers-watch-ref-a7438911bd82";

describe("savedPublicWatchForViber", () => {
  const savedRow = {
    id: "twa-001",
    slug: "saved-slug",
    name: "Saved public name",
    brand: "Seiko",
    model: "Saved model",
    reference: "SAVED-REF",
    price: 12_345,
    category: "pre-owned",
    badge: "Rare",
    badges: ["rare"],
    condition_label: "Saved condition",
    inclusion_set: "Saved inclusions",
    has_box: true,
    has_papers: false,
    description: "Saved public description",
    edition: "Saved edition",
    status: "reserved",
    published: true,
  };

  it("adapts only persisted public-row values", () => {
    expect(savedPublicWatchForViber(savedRow)).toEqual({
      id: "twa-001",
      slug: "saved-slug",
      name: "Saved public name",
      brand: "Seiko",
      model: "Saved model",
      reference: "SAVED-REF",
      price: 12_345,
      category: "pre-owned",
      badge: "Rare",
      badges: ["rare"],
      conditionLabel: "Saved condition",
      inclusionSet: "Saved inclusions",
      hasBox: true,
      hasPapers: false,
      description: "Saved public description",
      edition: "Saved edition",
      status: "reserved",
    });
  });

  it("rejects persisted drafts even if unsaved form state would say published", () => {
    const formState = { published: true, name: "Unsaved public name", price: 99_999 };
    expect(formState.published).toBe(true);
    expect(savedPublicWatchForViber({ ...savedRow, published: false })).toBeNull();
  });

  it("keeps a persisted public row shareable despite unsaved form edits", () => {
    const formState = { published: false, name: "Unsaved private name", price: 99_999 };
    const listing = savedPublicWatchForViber(savedRow);
    expect(formState.published).toBe(false);
    expect(listing?.name).toBe("Saved public name");
    expect(listing?.price).toBe(12_345);
  });

  it("rejects rows without a persisted public slug", () => {
    expect(savedPublicWatchForViber({ ...savedRow, slug: "" })).toBeNull();
  });
});

describe("buildViberSharePayload", () => {
  it("carries the saved sales copy with the short link under the title", () => {
    const payload = buildViberSharePayload(publishedWatch);

    expect(payload.message).toBe(
      [
        "Pre-owned",
        "Breitling Colt - Chronometre",
        "36mm Divers Watch - Ref. A7438911/BD82",
        shortUrl,
        "",
        "Php 69,800",
        "- complete set",
        "- 8.8-9/10 condition",
        "",
        "Discontinued Model",
      ].join("\n")
    );
    expect(payload.href).toBe(`viber://forward?text=${encodeURIComponent(payload.message)}`);
    expect(payload.bodyTruncated).toBe(false);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
    expect(payload.message).toHaveLength(payload.messageLength);
  });

  it("reports the canonical URL even though the deep link carries the short one", () => {
    const payload = buildViberSharePayload(publishedWatch);

    expect(payload.url).toBe(canonicalUrl);
    expect(payload.message).toContain(shortUrl);
    expect(payload.message).not.toContain("/watch/");
  });

  it("frees enough budget that the whole saved description survives", () => {
    const short = buildViberSharePayload(publishedWatch);
    const long = buildViberSharePayload({ ...publishedWatch, id: undefined });

    // Same listing, canonical link instead of /w/<id>: the copy no longer fits.
    expect(short.bodyTruncated).toBe(false);
    expect(long.bodyTruncated).toBe(true);
    expect(long.message).toContain(canonicalUrl);
  });

  it("falls back to the canonical link when the row has no short id", () => {
    const payload = buildViberSharePayload({ ...publishedWatch, id: "" });

    expect(payload.message).toContain(canonicalUrl);
    expect(payload.url).toBe(canonicalUrl);
  });

  it("synthesizes an owner-style caption when no saved copy exists", () => {
    const payload = buildViberSharePayload({ ...publishedWatch, description: "" });

    expect(payload.message).toBe(
      [
        "Breitling Colt Chronometre 36mm Divers Watch",
        shortUrl,
        "",
        "Pre-owned 8.8-9/10",
        "Includes: Complete set",
        "Php 69,800",
      ].join("\n")
    );
  });

  it("uses honest owner-style fallbacks for missing price and inclusions", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: "",
      price: 0,
      conditionLabel: "",
      inclusionSet: "",
      hasBox: true,
      hasPapers: true,
    });

    expect(payload.message).toContain("Includes: original box / papers / warranty");
    expect(payload.message).toContain("Price on request");
    expect(payload.message).not.toContain("Story coming soon");
  });

  it("adds SALE only when a synthesized caption carries a sale badge", () => {
    const sale = buildViberSharePayload({ ...publishedWatch, description: "", badge: "SALE" });
    const normal = buildViberSharePayload({ ...publishedWatch, description: "", badge: "Rare" });

    expect(sale.message.startsWith("SALE!\n")).toBe(true);
    expect(normal.message.startsWith("SALE!")).toBe(false);
  });

  it("strips an old embedded item URL so only one link ships", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: `Pre-owned\n\n🔗\nhttps://thewatchalley.com/watch/old-slug\n\nPhp 69,800`,
    });

    expect(payload.message).not.toContain("old-slug");
    expect(payload.message).not.toContain("🔗");
    expect(payload.message.match(/https:\/\/www\.thewatchalley\.com\//g)).toHaveLength(1);
  });

  it("drops whole trailing lines rather than the link, never mid-word", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: [
        "Pre-owned",
        "Breitling Colt - Chronometre",
        "",
        "Php 69,800",
        "- complete set",
        "8T63 Quartz Chronograph Movement",
        "5 bar / 50m Water Resistance",
        "Thickness: 12.6mm",
        "Diameter: 38.7mm",
        "Lug-to-lug: 44.6mm",
      ].join("\n"),
    });

    expect(payload.bodyTruncated).toBe(true);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
    expect(payload.message).toContain(shortUrl);
    expect(payload.message).not.toContain("Lug-to-lu");
    expect(payload.message).not.toContain("...");
  });

  it("flags truncation even when not one detail line survives", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: `${"T".repeat(150)}\n\n${"x".repeat(120)}`,
    });

    expect(payload.message).toBe(`${"T".repeat(150)}\n${shortUrl}`);
    expect(payload.bodyTruncated).toBe(true);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
  });

  it("falls back to the bare link when the title alone cannot fit beside it", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: "T".repeat(180),
    });

    expect(payload.message).toBe(shortUrl);
    expect(payload.bodyTruncated).toBe(true);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
  });

  it("replaces malformed UTF-16 in shared fields instead of crashing URI encoding", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: "Collector watch \ud800 with service history",
    });

    expect(payload.message).toContain("Collector watch � with service history");
    const href = payload.href;
    expect(() => decodeURIComponent(href)).not.toThrow();
  });

  it("keeps the decoded href identical to the message it advertises", () => {
    const payload = buildViberSharePayload(publishedWatch);
    const decoded = decodeURIComponent(payload.href.slice("viber://forward?text=".length));

    expect(decoded).toBe(payload.message);
  });

  it("rejects missing slugs instead of creating a misleading homepage share", () => {
    expect(() => buildViberSharePayload({ ...publishedWatch, id: "", slug: "" })).toThrow(
      "A saved public listing slug is required"
    );
  });
});

describe("buildViberFullMessage", () => {
  it("carries the complete saved copy with the canonical link under the title", () => {
    expect(buildViberFullMessage(publishedWatch)).toBe(
      [
        "Pre-owned",
        "Breitling Colt - Chronometre",
        "36mm Divers Watch - Ref. A7438911/BD82",
        canonicalUrl,
        "",
        "Php 69,800",
        "- complete set",
        "- 8.8-9/10 condition",
        "",
        "Discontinued Model",
      ].join("\n")
    );
  });

  it("is not capped by the URI budget that constrains the deep link", () => {
    const listing = {
      ...publishedWatch,
      description: [
        publishedWatch.description,
        "",
        "8T63 Quartz Chronograph Movement",
        "5 bar / 50m Water Resistance",
        "Thickness: 12.6mm",
      ].join("\n"),
    };
    const full = buildViberFullMessage(listing);
    const deepLink = buildViberSharePayload(listing);

    expect(full.length).toBeGreaterThan(LEGACY_VIBER_URI_BUDGET);
    expect(full).toContain("Thickness: 12.6mm");
    expect(deepLink.message).not.toContain("Thickness: 12.6mm");
    expect(deepLink.bodyTruncated).toBe(true);
  });

  it("rejects missing slugs like the deep-link payload does", () => {
    expect(() => buildViberFullMessage({ ...publishedWatch, slug: "" })).toThrow(
      "A saved public listing slug is required"
    );
  });
});
