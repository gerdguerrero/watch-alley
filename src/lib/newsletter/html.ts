import "server-only";

const SAFE_TAGS = new Set(["p", "br", "strong", "em", "b", "i", "h2", "h3", "ul", "ol", "li", "a"]);

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

function sanitizeTag(rawTag: string) {
  const closing = /^<\s*\//.test(rawTag);
  const match = rawTag.match(/^<\s*\/?\s*([a-zA-Z0-9-]+)/);
  const tag = match?.[1]?.toLowerCase();
  if (!tag || !SAFE_TAGS.has(tag)) return "";
  if (tag === "br") return "<br>";
  if (closing) return `</${tag}>`;
  if (tag !== "a") return `<${tag}>`;

  const hrefMatch = rawTag.match(/\s(?:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
  if (!href) return "<a>";
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`;
}

export function sanitizeNewsletterHtml(value: string) {
  return value.replace(/<[^>]*>/g, (tag) => sanitizeTag(tag));
}
