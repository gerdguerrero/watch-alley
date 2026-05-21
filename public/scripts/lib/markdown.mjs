// Tiny escape-safe Markdown renderer for The Watch Alley journal.
//
// Scope (intentional, narrow): headings (## / ###), paragraphs, bold,
// italic, inline code, fenced code blocks, blockquotes, unordered and
// ordered lists, links, images, hr. Everything not listed renders as
// escaped text.
//
// Why hand-rolled instead of `marked`/`markdown-it`?
//   • Zero runtime dependency in the build.
//   • Same output server-side and in the admin live preview.
//   • Predictable XSS posture: every input passes through escapeHtml first;
//     only the patterns we explicitly allow can produce HTML.
//
// Output deliberately leans editorial: <p>, <h2>, <h3>, <em>, <strong>,
// <blockquote>, <ul>, <ol>, <li>, <code>, <pre>, <a href>, <img src alt>,
// <hr>. No raw HTML pass-through; <script> et al. cannot survive escaping.

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

// URL allowlist: http, https, mailto, tel, relative paths starting with `/`
// or `#`. Anything else (javascript:, data:, etc.) renders as the raw text.
function safeUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^[/#]/.test(trimmed)) return trimmed;
  return '';
}

// Inline replacements applied to a fragment of text that has already been
// escapeHtml'd. We use the escaped delimiters intentionally.
function applyInline(escaped) {
  let out = escaped;

  // images first (before links: ![alt](src))
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    const safeSrc = safeUrl(src);
    if (!safeSrc) return _match;
    return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
  });

  // links: [text](href)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, href) => {
    const safeHref = safeUrl(href);
    if (!safeHref) return _match;
    const isExternal = /^https?:/i.test(safeHref) && !/^https?:\/\/(?:www\.)?watchalley\.ph/i.test(safeHref);
    const rel = isExternal ? ' rel="noopener noreferrer" target="_blank"' : '';
    return `<a href="${escapeHtml(safeHref)}"${rel}>${text}</a>`;
  });

  // bold: **text** or __text__
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');

  // italic: *text* or _text_ (not inside words)
  out = out.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  out = out.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');

  // inline code: `code`
  out = out.replace(/`([^`\n]+?)`/g, '<code>$1</code>');

  return out;
}

// Block-level pass. Splits on blank lines and classifies each block.
export function renderMarkdown(input) {
  if (!input) return '';
  const text = String(input).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const out = [];

  let i = 0;
  while (i < blocks.length) {
    const raw = blocks[i];
    const block = raw.replace(/^\n+|\n+$/g, '');
    if (!block.trim()) { i += 1; continue; }

    // Fenced code block: ```lang\n…\n```
    const fenceMatch = block.match(/^```(\w*)\n([\s\S]*?)\n```$/);
    if (fenceMatch) {
      const code = escapeHtml(fenceMatch[2]);
      out.push(`<pre><code>${code}</code></pre>`);
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(block.trim())) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    // Heading: ## or ###
    const headingMatch = block.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch && !/\n/.test(block)) {
      const level = headingMatch[1].length; // 2 or 3
      const inner = applyInline(escapeHtml(headingMatch[2].trim()));
      out.push(`<h${level}>${inner}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote: every line starts with `> `
    if (block.split('\n').every((line) => /^>\s?/.test(line))) {
      const inner = block.split('\n').map((line) => line.replace(/^>\s?/, '')).join('\n');
      out.push(`<blockquote><p>${applyInline(escapeHtml(inner)).replace(/\n/g, '<br>')}</p></blockquote>`);
      i += 1;
      continue;
    }

    // Unordered list: every non-empty line starts with `- ` or `* `
    if (block.split('\n').every((line) => /^[-*]\s+/.test(line))) {
      const items = block
        .split('\n')
        .map((line) => `<li>${applyInline(escapeHtml(line.replace(/^[-*]\s+/, '')))}</li>`)
        .join('');
      out.push(`<ul>${items}</ul>`);
      i += 1;
      continue;
    }

    // Ordered list: every line starts with `<digit>. `
    if (block.split('\n').every((line) => /^\d+\.\s+/.test(line))) {
      const items = block
        .split('\n')
        .map((line) => `<li>${applyInline(escapeHtml(line.replace(/^\d+\.\s+/, '')))}</li>`)
        .join('');
      out.push(`<ol>${items}</ol>`);
      i += 1;
      continue;
    }

    // Default: paragraph. Preserve single-line breaks as <br>.
    const paragraph = applyInline(escapeHtml(block)).replace(/\n/g, '<br>');
    out.push(`<p>${paragraph}</p>`);
    i += 1;
  }

  return out.join('\n');
}
