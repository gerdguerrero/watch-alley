import { describe, expect, it } from "vitest";
import {
  buildViberFullMessage,
  buildViberSharePayload,
  LEGACY_VIBER_URI_BUDGET,
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

const watchUrl = "https://www.thewatchalley.com/watch/seiko-prospex-baby-tuna-srpf81";

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
  it("puts the canonical link directly under the title, ahead of the detail lines", () => {
    const payload = buildViberSharePayload(publishedWatch);

    expect(payload.message).toBe(
      [
        "Seiko Prospex Baby Tuna SRPF81",
        watchUrl,
        "",
        "Pre-owned 9/10",
        "Includes: Watch only",
        "Php 28,500",
      ].join("\n")
    );
    expect(payload.href).toBe(`viber://forward?text=${encodeURIComponent(payload.message)}`);
    expect(payload.url).toBe(watchUrl);
    expect(payload.bodyTruncated).toBe(false);
    expect(payload.message).toHaveLength(payload.messageLength);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
  });

  it("builds the caption from structured fields, never the saved admin description", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      description: `${publishedWatch.description}\n🔗 https://thewatchalley.com/watch/old-slug`,
    });

    expect(payload.message.match(/https:\/\/(?:www\.)?thewatchalley\.com\/watch\//g)).toHaveLength(1);
    expect(payload.message).not.toContain("old-slug");
    expect(payload.message).not.toContain("🔗");
    expect(payload.message).not.toContain("- complete set");
  });

  it("drops a reference the name already repeats so it is not printed twice", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: "Seiko Prospex Baby Tuna - Ref. SRPF81K1",
    });

    expect(payload.message.startsWith("Seiko Prospex Baby Tuna\n")).toBe(true);
    expect(payload.message).not.toContain("Ref. SRPF81K1");
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

    expect(payload.message).toContain("Includes: original box / papers / warranty");
    expect(payload.message).toContain("Price on request");
    expect(payload.message).not.toContain("Story coming soon");
  });

  it("adds SALE only when the saved listing explicitly carries a sale badge", () => {
    const sale = buildViberSharePayload({ ...publishedWatch, badge: "SALE" });
    const normal = buildViberSharePayload({ ...publishedWatch, badge: "Rare" });

    expect(sale.message.startsWith("SALE!\n\nSeiko Prospex Baby Tuna SRPF81\n")).toBe(true);
    expect(normal.message.startsWith("SALE!")).toBe(false);
  });

  it("percent-encodes slugs so the shared link stays a single valid URL", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      slug: "limited edition / blue dial",
    });

    expect(payload.url).toBe(
      "https://www.thewatchalley.com/watch/limited%20edition%20%2F%20blue%20dial"
    );
    expect(payload.message).toContain(payload.url);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
  });

  it("replaces malformed UTF-16 in shared fields instead of crashing URI encoding", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: "Collector watch \ud800 with service history",
    });

    expect(payload.message).toContain("Collector watch � with service history");
    const href = payload.href;
    expect(() => decodeURIComponent(href)).not.toThrow();
  });

  it("drops trailing detail lines, not the link, when the caption overflows", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: "Seiko Prospex Diver Scuba 1968 Heritage GMT Limited Edition Save the Ocean Special Edition",
      price: 116_000,
      inclusionSet: "Complete Set",
    });

    expect(payload.bodyTruncated).toBe(true);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
    expect(payload.message).toContain(payload.url);
    expect(payload.message).toContain("Includes: Complete Set");
    expect(payload.message).not.toContain("Php 116,000");
    expect(payload.message).not.toContain("...");
  });

  it("keeps the complete link when a long slug leaves no room for the whole title", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      slug: "a".repeat(150),
      name: "The Watch Alley Chronograph Limited",
    });

    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
    expect(payload.message).toContain(payload.url);
    expect(payload.bodyTruncated).toBe(true);
    // Whole words only - the title is shortened at a space, never mid-word.
    expect(payload.message.split("\n")[0]).toBe("The Watch");
  });

  it("keeps a near-limit URL intact instead of shipping a stub title", () => {
    const payload = buildViberSharePayload(
      { slug: "x" },
      { origin: `https://${"a".repeat(181)}` }
    );

    expect(payload.message).toBe(payload.url);
    expect(payload.messageLength).toBe(197);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
  });

  it("rejects a URL that cannot fit inside Viber's ceiling at all", () => {
    expect(() =>
      buildViberSharePayload({ slug: "x" }, { origin: `https://${"a".repeat(200)}` })
    ).toThrow("too long to share through Viber safely");
  });

  it("never splits an emoji surrogate pair while shortening the title", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: `Seiko ${"⌚".repeat(180)}`,
      conditionLabel: "Excellent",
    });

    const href = payload.href;
    expect(() => decodeURIComponent(href)).not.toThrow();
    expect(payload.message).not.toContain("�");
    expect(payload.message).toHaveLength(payload.messageLength);
    expect(payload.messageLength).toBeLessThanOrEqual(LEGACY_VIBER_URI_BUDGET);
  });

  it("keeps the decoded href identical to the message it advertises", () => {
    const payload = buildViberSharePayload(publishedWatch);
    const decoded = decodeURIComponent(payload.href.slice("viber://forward?text=".length));

    expect(decoded).toBe(payload.message);
  });

  it("rejects missing slugs instead of creating a misleading homepage share", () => {
    expect(() => buildViberSharePayload({ ...publishedWatch, slug: "" })).toThrow(
      "A saved public listing slug is required"
    );
  });
});

describe("buildViberFullMessage", () => {
  it("carries every field with the link last for the copy-paste handoff", () => {
    expect(buildViberFullMessage(publishedWatch)).toBe(
      [
        "Seiko Prospex Baby Tuna SRPF81",
        "",
        "Pre-owned 9/10",
        "Includes: Watch only",
        "Php 28,500",
        "",
        watchUrl,
      ].join("\n")
    );
  });

  it("is not capped by the URI budget that constrains the deep link", () => {
    const listing = {
      ...publishedWatch,
      name: "Seiko Prospex Diver Scuba 1968 Heritage GMT Limited Edition Save the Ocean Special Edition",
      price: 116_000,
      inclusionSet: "Complete Set",
    };
    const full = buildViberFullMessage(listing);

    expect(full.length).toBeGreaterThan(LEGACY_VIBER_URI_BUDGET);
    expect(full).toContain("Php 116,000");
    expect(full.endsWith(watchUrl)).toBe(true);
  });

  it("rejects missing slugs like the deep-link payload does", () => {
    expect(() => buildViberFullMessage({ ...publishedWatch, slug: "" })).toThrow(
      "A saved public listing slug is required"
    );
  });
});
