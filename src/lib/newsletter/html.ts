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

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
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
      if (!/^(?:rgb|rgba|oklch|hsl|hsla)\([^)]+\)$/i.test(val)) {
        continue;
      }
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

  if (tag === "a") {
    const hrefMatch = rawTag.match(/\s(?:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
    if (!href) return `<a${styleAttr}>`;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${styleAttr}>`;
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

    return `<img src="${escapeHtml(src)}"${altAttr}${widthAttr}${heightAttr}${styleAttr} />`;
  }

  return `<${tag}${styleAttr}>`;
}

export function sanitizeNewsletterHtml(value: string) {
  return value.replace(/<[^>]*>/g, (tag) => sanitizeTag(tag));
}
