import { describe, expect, it } from "vitest";
import { formatWatchTitle } from "../src/lib/inventory/format";

describe("formatWatchTitle", () => {
  it("does not duplicate a brand already present at the start of the name", () => {
    expect(formatWatchTitle("Seiko", "Seiko Prospex Baby Tuna")).toBe(
      "Seiko Prospex Baby Tuna"
    );
  });

  it("prepends the brand when the name does not already contain it", () => {
    expect(formatWatchTitle("Omega", "Seamaster Professional")).toBe(
      "Omega Seamaster Professional"
    );
  });

  it("normalizes surrounding and repeated whitespace", () => {
    expect(formatWatchTitle("  Grand   Seiko ", "  Snowflake   SBGA211 ")).toBe(
      "Grand Seiko Snowflake SBGA211"
    );
  });
});