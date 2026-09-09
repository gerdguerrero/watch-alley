import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The email shell's CSS lives in a template literal inside send.ts, so it
 * cannot be imported and asserted on directly. Lifting the <style> block from
 * the source is the honest way to pin the mobile contract: these four rules are
 * the whole reason an issue renders on a phone, and each has a failure mode
 * that only shows up in somebody's inbox.
 */
const source = readFileSync("src/lib/newsletter/send.ts", "utf8");
const style = /<style>([\s\S]*?)<\/style>/.exec(source)?.[1] ?? "";

describe("newsletter shell stays responsive", () => {
  it("lifts a style block with no unresolved interpolation", () => {
    expect(style.length).toBeGreaterThan(500);
    expect(style).not.toContain("${");
  });

  it("declares the viewport, without which a phone renders it at desktop width", () => {
    expect(source).toContain('name="viewport"');
    expect(source).toContain("width=device-width");
  });

  it("caps the container at 600px and lets it shrink below that", () => {
    expect(style).toMatch(/\.container\s*\{[^}]*max-width:\s*600px/);
    expect(style).not.toMatch(/\.container\s*\{[^}]*[^-]width:\s*600px/);
  });

  it("keeps a small-screen breakpoint that reduces padding and type", () => {
    expect(style).toMatch(/@media screen and \(max-width:\s*480px\)/);
  });

  it("forces every image in an issue body to be fluid", () => {
    // Without this a pasted photograph keeps its intrinsic width and gives the
    // whole email a horizontal scrollbar on a phone.
    expect(style).toMatch(/\.content img\s*\{[^}]*max-width:\s*100%/);
    expect(style).toMatch(/\.content img\s*\{[^}]*height:\s*auto/);
  });
});
