/**
 * Tiny escape-safe Markdown renderer for The Watch Alley journal.
 *
 * Ported verbatim from scripts/lib/markdown.mjs so the Next.js render and the
 * Vite-era render produce identical HTML. Admin's live preview will match
 * server-rendered output once the admin section moves to Next.js too.
 *
 * Scope (intentional, narrow): headings (## / ###), paragraphs, bold, italic,
 * inline code, fenced code blocks, blockquotes, unordered + ordered lists,
 * links, images, hr. Everything not listed renders as escaped text. Zero
 * runtime dependency; XSS is bounded by escapeHtml() being the first step on
 * every text fragment.
 */

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch as "&" | "<" | ">" | '"' | "'"
      ]
  );
}

function safeUrl(url: string): string {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[/#]/.test(trimmed)) return trimmed;
  return "";
}

function applyInline(escaped: string): string {
  let out = escaped;

  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt: string, src: string) => {
    const safeSrc = safeUrl(src);
    if (!safeSrc) return m;
    return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text: string, href: string) => {
    const safeHref = safeUrl(href);
    if (!safeHref) return m;
    const isExternal =
      /^https?:/i.test(safeHref) && !/^https?:\/\/(?:www\.)?watchalley\.ph/i.test(safeHref);
    const rel = isExternal ? ' rel="noopener noreferrer" target="_blank"' : "";
    return `<a href="${escapeHtml(safeHref)}"${rel}>${text}</a>`;
  });

  out = out.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");

  out = out.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");

  out = out.replace(/`([^`\n]+?)`/g, "<code>$1</code>");

  return out;
}

export function renderMarkdown(input: string | null | undefined): string {
  if (!input) return "";
  const text = String(input).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = text.split(/\n{2,}/);
  const out: string[] = [];

  for (const raw of blocks) {
    const block = raw.replace(/^\n+|\n+$/g, "");
    if (!block.trim()) continue;

    const fenceMatch = block.match(/^```(\w*)\n([\s\S]*?)\n```$/);
    if (fenceMatch) {
      out.push(`<pre><code>${escapeHtml(fenceMatch[2])}</code></pre>`);
      continue;
    }

    if (/^---+$/.test(block.trim())) {
      out.push("<hr>");
      continue;
    }

    const headingMatch = block.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch && !/\n/.test(block)) {
      const level = headingMatch[1].length;
      const inner = applyInline(escapeHtml(headingMatch[2].trim()));
      out.push(`<h${level}>${inner}</h${level}>`);
      continue;
    }

    if (block.split("\n").every((line) => /^>\s?/.test(line))) {
      const inner = block
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .join("\n");
      out.push(
        `<blockquote><p>${applyInline(escapeHtml(inner)).replace(/\n/g, "<br>")}</p></blockquote>`
      );
      continue;
    }

    if (block.split("\n").every((line) => /^[-*]\s+/.test(line))) {
      const items = block
        .split("\n")
        .map((line) => `<li>${applyInline(escapeHtml(line.replace(/^[-*]\s+/, "")))}</li>`)
        .join("");
      out.push(`<ul>${items}</ul>`);
      continue;
    }

    if (block.split("\n").every((line) => /^\d+\.\s+/.test(line))) {
      const items = block
        .split("\n")
        .map((line) => `<li>${applyInline(escapeHtml(line.replace(/^\d+\.\s+/, "")))}</li>`)
        .join("");
      out.push(`<ol>${items}</ol>`);
      continue;
    }

    const paragraph = applyInline(escapeHtml(block)).replace(/\n/g, "<br>");
    out.push(`<p>${paragraph}</p>`);
  }

  return out.join("\n");
}
