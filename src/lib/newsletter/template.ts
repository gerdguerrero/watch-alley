import "server-only";
import { escapeHtml } from "@/lib/newsletter/html";

/**
 * Shared HTML fragments for newsletter issue bodies. Both the AI-generated
 * and the system-scaffold paths of /api/newsletter/generate-draft compose
 * their body_html from these, so the rendered email stays identical no matter
 * which path produced the draft.
 *
 * All fragment text is escaped here; callers pass plain strings (except
 * renderNoteBoxHtml, which accepts already-sanitized inner HTML).
 */

export interface EmailWatchCardData {
  slug: string;
  brand: string;
  name: string;
  reference?: string | null;
  conditionLabel?: string | null;
  price?: number | null;
  primaryImage?: string | null;
}

const SERIF = "'Petrona', Georgia, serif";
const BODY_SERIF = "'Spectral', Georgia, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function watchImageHtml(watch: EmailWatchCardData, { dimmed = false } = {}) {
  if (!watch.primaryImage) return "";
  const linkStyle = dimmed ? "text-decoration: none; opacity: 0.85;" : "text-decoration: none;";
  return `
    <div style="margin-bottom: 20px; text-align: center;">
      <a href="/watch/${watch.slug}" style="${linkStyle}">
        <img src="${watch.primaryImage}" alt="${escapeHtml(watch.brand)} ${escapeHtml(watch.name)}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid rgba(189, 154, 50, 0.15);" width="520" />
      </a>
    </div>`;
}

function priceLabel(price: number | null | undefined) {
  return price ? price.toLocaleString("en-PH") : "Inquire";
}

export function renderWatchCardHtml(
  watch: EmailWatchCardData,
  { title, summary }: { title: string; summary: string }
) {
  return `
    <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
      ${watchImageHtml(watch)}
      <h3 style="font-family: ${SERIF}; font-size: 22px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3;">
        <a href="/watch/${watch.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(title)}</a>
      </h3>
      <div style="font-family: ${SANS}; font-size: 11px; letter-spacing: 0.1em; color: #BD9A32; text-transform: uppercase; margin-bottom: 12px; font-weight: bold;">
        Ref: ${escapeHtml(watch.reference || "N/A")} · ${escapeHtml(watch.conditionLabel || "Excellent")} · ₱${priceLabel(watch.price)}
      </div>
      <p style="font-family: ${BODY_SERIF}; font-size: 15px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0;">
        ${escapeHtml(summary)}
      </p>
      <div style="text-align: left;">
        <a href="/watch/${watch.slug}" style="display: inline-block; background-color: #BD9A32; color: #13110f; font-family: ${SANS}; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">View watch details</a>
      </div>
    </div>`;
}

export function renderSoldHighlightHtml(
  watch: EmailWatchCardData,
  { title, summary }: { title: string; summary: string }
) {
  return `
    <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(189, 154, 50, 0.1); padding-bottom: 30px;">
      <div style="font-family: ${SANS}; font-size: 11px; letter-spacing: 0.2em; color: #BD9A32; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; text-align: center;">From the Sold Archive</div>
      ${watchImageHtml(watch, { dimmed: true })}
      <h3 style="font-family: ${SERIF}; font-size: 20px; font-weight: normal; margin: 0 0 8px 0; color: #F1ECE0; line-height: 1.3; text-align: center;">
        <a href="/watch/${watch.slug}" style="color: #F1ECE0; text-decoration: none;">${escapeHtml(title)}</a>
      </h3>
      <p style="font-family: ${BODY_SERIF}; font-size: 14px; line-height: 1.7; color: #d1d1cd; margin: 0 0 20px 0; text-align: center;">
        ${escapeHtml(summary)}
      </p>
      <div style="text-align: center;">
        <a href="/watch-list#sourcing" style="display: inline-block; border: 1px solid #BD9A32; color: #BD9A32; font-family: ${SANS}; font-size: 11px; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 12px 24px; border-radius: 0px; text-align: center;">Request a similar piece</a>
      </div>
    </div>`;
}

/** `innerHtml` must already be escaped or sanitized by the caller. */
export function renderNoteBoxHtml({ title, innerHtml }: { title: string; innerHtml: string }) {
  return `
    <div style="margin-bottom: 40px; padding: 24px; border: 1px solid rgba(189, 154, 50, 0.2); background-color: rgba(189, 154, 50, 0.03);">
      <h3 style="font-family: ${SERIF}; font-size: 20px; font-weight: normal; margin: 0 0 16px 0; color: #BD9A32; line-height: 1.3;">
        ${escapeHtml(title)}
      </h3>
      <div style="font-family: ${BODY_SERIF}; font-size: 15px; line-height: 1.7; color: #d1d1cd;">
        ${innerHtml}
      </div>
    </div>`;
}

export const SOURCING_CTA_HTML = `
    <p style="margin-top: 32px; text-align: center;"><a href="https://www.thewatchalley.com/watch-list#sourcing" style="font-family: ${SANS}; font-size: 12px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #BD9A32; text-decoration: none; border-bottom: 1px solid #BD9A32;">Send a sourcing request</a></p>`;
