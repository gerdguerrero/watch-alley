import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/journal/markdown";

describe("renderMarkdown", () => {
  it("escapes raw HTML before any formatting is applied", () => {
    const out = renderMarkdown('<script>alert("x")</script> and <img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img src=x");
    expect(out).toContain("&lt;script&gt;");
  });

  it("refuses javascript: links and leaves them as literal text", () => {
    const out = renderMarkdown("[click](javascript:alert(1))");
    expect(out).not.toContain('href="javascript:');
    expect(out).toContain("[click]");
  });

  it("allows https, mailto, anchor and relative links", () => {
    expect(renderMarkdown("[a](https://example.com)")).toContain('href="https://example.com"');
    expect(renderMarkdown("[a](/watch/foo)")).toContain('href="/watch/foo"');
    expect(renderMarkdown("[a](#section)")).toContain('href="#section"');
  });

  it("marks external links with rel and target, not internal ones", () => {
    expect(renderMarkdown("[a](https://example.com)")).toContain("noopener noreferrer");
    expect(renderMarkdown("[a](https://www.thewatchalley.com/watch/x)")).not.toContain(
      "noopener noreferrer"
    );
  });

  it("refuses javascript: image sources", () => {
    const out = renderMarkdown("![alt](javascript:alert(1))");
    expect(out).not.toContain("<img");
  });

  it("escapes attribute-breaking quotes in image alt text", () => {
    const out = renderMarkdown('![" onerror="alert(1)](https://example.com/a.png)');
    // The quote must arrive escaped inside the alt attribute so it can never
    // close the attribute and smuggle an onerror handler onto the tag.
    expect(out).not.toContain('onerror="alert');
    expect(out).toMatch(/alt="[^"]*"/);
  });

  it("renders code blocks with contents escaped", () => {
    const out = renderMarkdown('```\n<script>alert("x")</script>\n```');
    expect(out).toContain("<pre><code>");
    expect(out).not.toContain("<script>");
  });

  it("renders basic structure: headings, lists, bold, blockquote", () => {
    expect(renderMarkdown("## Title")).toBe("<h2>Title</h2>");
    expect(renderMarkdown("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
    expect(renderMarkdown("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>");
    expect(renderMarkdown("**bold** text")).toContain("<strong>bold</strong>");
    expect(renderMarkdown("> quoted")).toContain("<blockquote>");
  });

  it("returns empty string for null/undefined/empty input", () => {
    expect(renderMarkdown(null)).toBe("");
    expect(renderMarkdown(undefined)).toBe("");
    expect(renderMarkdown("")).toBe("");
  });
});
