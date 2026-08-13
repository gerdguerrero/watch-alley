import { describe, expect, it } from "vitest";
import {
  buildViberSharePayload,
  DEFAULT_VIBER_MESSAGE_BUDGET,
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
  description:
    "A compact blue diver with strong wrist presence, a shrouded case, and Seiko's dependable automatic movement.",
  status: "available",
};

describe("buildViberSharePayload", () => {
  it("builds a readable product message with the public link near the top", () => {
    const payload = buildViberSharePayload(publishedWatch);

    expect(payload.message).toBe(
      [
        "Seiko Prospex Baby Tuna SRPF81",
        "View: https://thewatchalley.com/watch/seiko-prospex-baby-tuna-srpf81",
        "",
        "₱28,500 · Pre-owned 9/10",
        "Available now. Reply to inquire or reserve.",
      ].join("\n")
    );
    expect(payload.href).toBe(`viber://forward?text=${encodeURIComponent(payload.message)}`);
    expect(payload.url).toBe(
      "https://thewatchalley.com/watch/seiko-prospex-baby-tuna-srpf81"
    );
    expect(payload.message).toHaveLength(payload.messageLength);
    expect(payload.messageLength).toBeLessThanOrEqual(DEFAULT_VIBER_MESSAGE_BUDGET);
  });

  it("uses the display name once instead of duplicating the brand", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: "",
      brand: "Omega",
      model: "Omega Seamaster Professional",
    });

    expect(payload.message.split("\n")[0]).toBe("Omega Seamaster Professional");
    expect(payload.message).not.toContain("Omega Omega");
  });

  it("uses honest fallbacks for price and condition", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      price: 0,
      conditionLabel: "",
      inclusionSet: "",
      hasBox: true,
      hasPapers: true,
      description: "",
    });

    expect(payload.message).toContain("Price on request · Condition on request");
    expect(payload.message).not.toContain("Story coming soon");
  });

  it("uses status-specific calls to action", () => {
    expect(buildViberSharePayload({ ...publishedWatch, status: "reserved" }).message).toContain(
      "Reserved. Reply to check availability or ask about similar pieces."
    );
    expect(buildViberSharePayload({ ...publishedWatch, status: "sold" }).message).toContain(
      "Sold. Reply to ask about similar references."
    );
  });

  it("percent-encodes slugs and keeps the decoded message within Viber's documented limit", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      slug: "limited edition / blue dial",
      description: `${"Collector-owned watch with documented service history. ".repeat(120)}⌚`,
    });

    expect(payload.message).toContain(
      "https://thewatchalley.com/watch/limited%20edition%20%2F%20blue%20dial"
    );
    expect(payload.messageLength).toBeLessThanOrEqual(DEFAULT_VIBER_MESSAGE_BUDGET);
    expect(payload.message).not.toContain("Collector-owned watch");
  });

  it("replaces malformed UTF-16 in shared fields instead of crashing URI encoding", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: "Collector watch \ud800 with service history",
    });

    expect(payload.href).toContain("viber://forward?text=");
    expect(payload.message).toContain("Collector watch � with service history");
  });

  it("drops optional condition copy before shortening an unusually long title", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: "Seiko Prospex Limited Edition Automatic Diver With An Exceptionally Long Collector-Facing Display Name",
      conditionLabel: "Pre-owned with a detailed condition report available on the public listing",
    });

    expect(payload.messageLength).toBeLessThanOrEqual(DEFAULT_VIBER_MESSAGE_BUDGET);
    expect(payload.message).toContain("₱28,500");
    expect(payload.message).not.toContain("detailed condition report");
    expect(payload.message).not.toContain("\n\n\n");
  });

  it("never splits an emoji surrogate pair while cleaning or shortening copy", () => {
    const payload = buildViberSharePayload({
      ...publishedWatch,
      name: `Seiko ${"⌚".repeat(180)}`,
      conditionLabel: "Excellent",
    });

    expect(() => decodeURIComponent(payload.href)).not.toThrow();
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
