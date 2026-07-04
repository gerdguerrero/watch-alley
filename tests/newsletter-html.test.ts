import { describe, expect, it } from "vitest";
import { escapeHtml, sanitizeNewsletterHtml } from "@/lib/newsletter/html";

describe("escapeHtml", () => {
  it("escapes all five HTML metacharacters", () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'> & more`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt; &amp; more"
    );
  });
});

describe("sanitizeNewsletterHtml", () => {
  it("strips script tags entirely", () => {
    const out = sanitizeNewsletterHtml('<p>hi</p><script>alert("xss")</script>');
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>");
  });

  it("strips iframe, style, form and other unlisted tags", () => {
    for (const tag of ["iframe", "style", "form", "object", "embed", "svg", "math", "table"]) {
      const out = sanitizeNewsletterHtml(`<${tag}>x</${tag}>`);
      expect(out).not.toContain(`<${tag}`);
      expect(out).not.toContain(`</${tag}`);
    }
  });

  it("drops event handler attributes from allowed tags", () => {
    const out = sanitizeNewsletterHtml('<p onclick="alert(1)" onmouseover="x()">hi</p>');
    expect(out).toBe("<p>hi</p>");
  });

  it("rejects javascript: and data: hrefs on links", () => {
    expect(sanitizeNewsletterHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("href");
    expect(sanitizeNewsletterHtml('<a href="data:text/html,x">x</a>')).not.toContain("href");
    // Case/whitespace obfuscation
    expect(sanitizeNewsletterHtml('<a href=" JaVaScRiPt:alert(1)">x</a>')).not.toContain("href");
  });

  it("keeps https, mailto, tel and site-relative hrefs", () => {
    expect(sanitizeNewsletterHtml('<a href="https://example.com/a">x</a>')).toContain(
      'href="https://example.com/a"'
    );
    expect(sanitizeNewsletterHtml('<a href="mailto:a@b.com">x</a>')).toContain("mailto:a@b.com");
    expect(sanitizeNewsletterHtml('<a href="/watch/foo">x</a>')).toContain('href="/watch/foo"');
    // Protocol-relative is not site-relative
    expect(sanitizeNewsletterHtml('<a href="//evil.com/x">x</a>')).not.toContain("evil.com");
  });

  it("requires https for image sources and drops the img otherwise", () => {
    expect(sanitizeNewsletterHtml('<img src="http://evil.com/a.png">')).toBe("");
    expect(sanitizeNewsletterHtml('<img src="javascript:alert(1)">')).toBe("");
    expect(sanitizeNewsletterHtml('<img src="https://ok.com/a.png">')).toContain(
      'src="https://ok.com/a.png"'
    );
  });

  it("filters style declarations to the safe property allow-list", () => {
    const out = sanitizeNewsletterHtml(
      '<p style="color: #fff; position: fixed; background: url(javascript:alert(1))">x</p>'
    );
    expect(out).toContain("color: #fff");
    expect(out).not.toContain("position");
    expect(out).not.toContain("url(");
  });

  it("blocks expression() and non-color CSS functions", () => {
    const out = sanitizeNewsletterHtml('<p style="width: expression(alert(1))">x</p>');
    expect(out).toBe("<p>x</p>");
    const calc = sanitizeNewsletterHtml('<p style="width: calc(100% - 10px)">x</p>');
    expect(calc).toBe("<p>x</p>");
    const rgb = sanitizeNewsletterHtml('<p style="color: rgb(1, 2, 3)">x</p>');
    expect(rgb).toContain("rgb(1, 2, 3)");
  });

  it("keeps only allow-listed classes", () => {
    const out = sanitizeNewsletterHtml('<span class="eyebrow evil-class muted">x</span>');
    expect(out).toContain('class="eyebrow muted"');
    expect(out).not.toContain("evil-class");
  });

  it("forces target and rel on kept links", () => {
    const out = sanitizeNewsletterHtml('<a href="https://example.com">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });
});
