import { describe, expect, it } from "vitest";
import {
  buildViberSharePayload,
  DEFAULT_VIBER_MESSAGE_BUDGET,
  savedPublicWatchForViber,
} from "../public/scripts/lib/viber-share.mjs";

const publishedWatch = {
  slug: "seiko-prospex-baby-tuna-srpf81",
  name: "Seiko Prospex Baby Tuna SRPF81",
  brand: "Seiko",
  model: "Prospex Baby Tuna SRPF81",
  reference: "SRPF81K1",
  price: 28_500,
  conditionLabel: "Pre-owned 9/10",
  inclusionSet: "Watch only",
  description: [
    "Pre-owned",
    "Seiko Prospex - Baby Tuna",
    "SRPF81 / SRPF81K1 Blue - Diver's Watch",
    "",
    "Php 28,500",
    "- complete set",
    "- 9/10 condition",
  ].join("\n"),
  status: "available",
};

describe("savedPublicWatchForViber", () => {
  const savedRow = {
    id: "watch-1",
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
  it("preserves the owner's saved sales copy and puts the bare item link last", () => {
    const payload = buildViberSharePayload(publishedWatch);

    expect(payload.message).toBe(
      [
        "Pre-owned",
        "Seiko Prospex - Baby Tuna",
        "SRPF81 / SRPF81K1 Blue - Diver's Watch",
        "",
        "Php 28,500",
        "- complete set",
        "- 9/10 condition",
        "",
        "https://www.thewatchalley.com/watch/seiko-prospex-baby-tuna-srpf81",
      ].join("\n")
    );
    expect(payload.href).toBe(`viber://forward?text=${encodeURIComponent(payload.message)}`);
    expect(payload.url).toBe(
      "https://www.thewatchalley.com/watch/seiko-prospex-baby-tuna-srpf81"
    );
    expect(payload.message.endsWith(payload.url)).toBe(true);
    expect(payload.message).toHaveLength(payload.messageLength);
    expect(payload.messageLength).toBeLessThanOrEqual(DEFAULT_VIBER_MESSAGE_BUDGET);
  });

  it("removes an old embedded item URL before appending one canonical final link", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: `${publishedWatch.description}\n🔗 https://thewatchalley.com/watch/old-slug`,
    });

    expect(payload.message.match(/https:\/\/(?:www\.)?thewatchalley\.com\/watch\//g)).toHaveLength(1);
    expect(payload.message.endsWith(payload.url)).toBe(true);
    expect(payload.message).not.toContain("old-slug");
    expect(payload.message).not.toContain("🔗");
  });

  it("synthesizes the owner's format when no saved sales copy exists", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: "",
      category: "brand-new",
      name: "Seiko Prospex Diver Scuba 1968 Heritage GMT Limited Edition",
      reference: "SBEJ030",
      edition: "1968 Heritage Diver GMT Limited to 500 pcs",
      price: 116_000,
      inclusionSet: "Complete Set",
    });

    expect(payload.message).toBe(
      [
        "Brand New",
        "Seiko Prospex Diver Scuba 1968 Heritage GMT Limited Edition",
        "",
        "SBEJ030 - 1968 Heritage Diver GMT Limited to 500 pcs",
        "",
        "Php 116,000",
        "- Complete Set",
        "",
        "https://www.thewatchalley.com/watch/seiko-prospex-baby-tuna-srpf81",
      ].join("\n")
    );
  });

  it("uses honest owner-style fallbacks for missing price and inclusions", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      price: 0,
      conditionLabel: "",
      inclusionSet: "",
      hasBox: true,
      hasPapers: true,
      description: "",
    });

    expect(payload.message).toContain("Price on request");
    expect(payload.message).not.toContain("Story coming soon");
  });

  it("adds SALE only when the saved listing explicitly carries a sale badge", () => {
    const sale = buildViberSharePayload({ ...publishedWatch, description: "", badge: "SALE" });
    const normal = buildViberSharePayload({ ...publishedWatch, description: "", badge: "Rare" });
    expect(sale.message.startsWith("SALE!\n\nPre-owned")).toBe(true);
    expect(normal.message.startsWith("SALE!")).toBe(false);
  });

  it("percent-encodes slugs and keeps the canonical link as the final line", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      slug: "limited edition / blue dial",
      description: `${"Collector-owned watch with documented service history. ".repeat(120)}⌚`,
    });

    expect(payload.message).toContain(
      "https://www.thewatchalley.com/watch/limited%20edition%20%2F%20blue%20dial"
    );
    expect(payload.messageLength).toBeLessThanOrEqual(DEFAULT_VIBER_MESSAGE_BUDGET);
    expect(payload.message.endsWith(payload.url)).toBe(true);
  });

  it("replaces malformed UTF-16 in shared fields instead of crashing URI encoding", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: "Collector watch \ud800 with service history",
      description: "",
    });

    expect(payload.message).toContain("Collector watch � with service history");
    if (payload.href) {
      const href = payload.href;
      expect(() => decodeURIComponent(href)).not.toThrow();
    }
  });

  it("always provides a direct Viber app URI, including for a long owner-format post", () => {
    const short = buildViberSharePayload({
      ...publishedWatch,
      description: "Pre-owned\nSeiko Diver\n\nPhp 28,500",
    });
    const ownerLength = buildViberSharePayload({
      ...publishedWatch,
      description: [
        "Brand New",
        "Seiko Prospex Diver Scuba",
        "1968 Heritage GMT Limited Edition",
        "",
        "SBEJ030 - 1968 Heritage",
        "Diver GMT ‼️ Limited to",
        "500 pcs‼️",
        "",
        "Php 116,000",
        "- Complete Set",
      ].join("\n"),
    });

    expect(short.href).toBe(`viber://forward?text=${encodeURIComponent(short.message)}`);
    expect(short.messageLength).toBeLessThanOrEqual(200);
    expect(ownerLength.messageLength).toBeGreaterThan(200);
    expect(ownerLength.href).toBe(
      `viber://forward?text=${encodeURIComponent(ownerLength.message)}`
    );
    expect(ownerLength.message.endsWith(ownerLength.url)).toBe(true);
  });

  it("trims an unusually long saved caption while preserving the complete final URL", () => {
    const payload = buildViberSharePayload(
      {
        ...publishedWatch,
        description: "Collector details. ".repeat(300),
      },
      { messageBudget: 300 }
    );

    expect(payload.messageLength).toBeLessThanOrEqual(DEFAULT_VIBER_MESSAGE_BUDGET);
    expect(payload.message.endsWith(payload.url)).toBe(true);
    expect(payload.bodyTruncated).toBe(true);
  });

  it("never splits an emoji surrogate pair while cleaning or shortening copy", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: `Seiko ${"⌚".repeat(180)}`,
      conditionLabel: "Excellent",
      description: "",
    });

    if (payload.href) {
      const href = payload.href;
      expect(() => decodeURIComponent(href)).not.toThrow();
    }
    expect(payload.message).not.toContain("�");
    expect(payload.message).toHaveLength(payload.messageLength);
    expect(payload.messageLength).toBeLessThanOrEqual(DEFAULT_VIBER_MESSAGE_BUDGET);
  });

  it("rejects missing slugs instead of creating a misleading homepage share", () => {
    expect(() => buildViberSharePayload({ ...publishedWatch, slug: "" })).toThrow(
      "A saved public listing slug is required"
    );
  });
});
