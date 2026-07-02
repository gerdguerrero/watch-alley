import "server-only";

const SAFE_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "div",
  "img",
  "span",
  "hr",
]);

// Semantic classes styled centrally in the email shell (src/lib/newsletter/send.ts) so
// text colors can adapt to the recipient's light/dark mode preference. Newsletter authors
// should reach for these instead of hardcoding a hex color that only looks right in one mode.
const SAFE_CLASSES = new Set(["eyebrow", "muted", "accent-heading", "heading", "btn-outline"]);

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SAFE_HREF_PROTOCOLS = new Set(["https:", "mailto:", "tel:"]);

function safeHref(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    return SAFE_HREF_PROTOCOLS.has(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function safeClassAttr(rawTag: string) {
  const classMatch = rawTag.match(/\s(?:class)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const raw = classMatch?.[1] ?? classMatch?.[2] ?? classMatch?.[3] ?? "";
  const classes = raw.split(/\s+/).filter((cls) => SAFE_CLASSES.has(cls));
  return classes.length ? ` class="${classes.join(" ")}"` : "";
}

function safeImgSrc(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function sanitizeStyle(styleStr: string): string {
  if (!styleStr) return "";
  const declarations = styleStr.split(";");
  const cleanDeclarations: string[] = [];
  const safeProperties = new Set([
    "margin",
    "margin-top",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "padding",
    "padding-top",
    "padding-bottom",
    "padding-left",
    "padding-right",
    "color",
    "background-color",
    "background",
    "border",
    "border-top",
    "border-bottom",
    "border-left",
    "border-right",
    "border-width",
    "border-style",
    "border-color",
    "border-radius",
    "border-collapse",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "line-height",
    "letter-spacing",
    "text-transform",
    "text-decoration",
    "text-align",
    "text-underline-offset",
    "text-decoration-color",
    "width",
    "max-width",
    "min-width",
    "height",
    "max-height",
    "min-height",
    "display",
    "vertical-align",
    "opacity",
    "filter",
    "overflow",
    "overflow-y",
    "list-style",
    "list-style-type",
  ]);

  for (const decl of declarations) {
    const parts = decl.split(":");
    if (parts.length < 2) continue;
    const prop = parts[0].trim().toLowerCase();
    const val = parts.slice(1).join(":").trim();

    if (!safeProperties.has(prop)) continue;

    if (
      val.includes("javascript:") ||
      val.includes("expression") ||
      val.includes("behavior") ||
      val.includes("<") ||
      val.includes(">")
    ) {
      continue;
    }

    if (val.includes("(")) {
      const matches = val.match(/[a-zA-Z0-9-]+\s*\(/g);
      if (!matches) {
        continue;
      }
      let allSafe = true;
      for (const m of matches) {
        const name = m.replace("(", "").trim().toLowerCase();
        if (!["rgb", "rgba", "oklch", "hsl", "hsla"].includes(name)) {
          allSafe = false;
          break;
        }
      }
      if (!allSafe) continue;
    }

    cleanDeclarations.push(`${prop}: ${val}`);
  }
  return cleanDeclarations.join("; ");
}

function sanitizeTag(rawTag: string) {
  const closing = /^<\s*\//.test(rawTag);
  const match = rawTag.match(/^<\s*\/?\s*([a-zA-Z0-9-]+)/);
  const tag = match?.[1]?.toLowerCase();
  if (!tag || !SAFE_TAGS.has(tag)) return "";
  if (tag === "br") return "<br>";
  if (closing) return `</${tag}>`;

  const styleMatch = rawTag.match(/\s(?:style)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const rawStyle = styleMatch?.[1] ?? styleMatch?.[2] ?? styleMatch?.[3] ?? "";
  const style = sanitizeStyle(rawStyle);
  const styleAttr = style ? ` style="${escapeHtml(style)}"` : "";
  const classAttr = safeClassAttr(rawTag);

  if (tag === "a") {
    const hrefMatch = rawTag.match(/\s(?:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
    if (!href) return `<a${classAttr}${styleAttr}>`;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${classAttr}${styleAttr}>`;
  }

  if (tag === "img") {
    const srcMatch = rawTag.match(/\s(?:src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = safeImgSrc(srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? "");
    if (!src) return "";

    const altMatch = rawTag.match(/\s(?:alt)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const alt = altMatch?.[1] ?? altMatch?.[2] ?? altMatch?.[3] ?? "";
    const altAttr = alt ? ` alt="${escapeHtml(alt)}"` : "";

    const widthMatch = rawTag.match(/\s(?:width)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const width = widthMatch?.[1] ?? widthMatch?.[2] ?? widthMatch?.[3] ?? "";
    const widthAttr = width && /^[0-9%a-zA-Z]+$/.test(width) ? ` width="${width}"` : "";

    const heightMatch = rawTag.match(/\s(?:height)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const height = heightMatch?.[1] ?? heightMatch?.[2] ?? heightMatch?.[3] ?? "";
    const heightAttr = height && /^[0-9%a-zA-Z]+$/.test(height) ? ` height="${height}"` : "";

    return `<img src="${escapeHtml(src)}"${altAttr}${widthAttr}${heightAttr}${classAttr}${styleAttr} />`;
  }

  return `<${tag}${classAttr}${styleAttr}>`;
}

export function sanitizeNewsletterHtml(value: string) {
  return value.replace(/<[^>]*>/g, (tag) => sanitizeTag(tag));
}
