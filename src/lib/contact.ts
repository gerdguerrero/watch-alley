import type { Watch } from "@/lib/inventory/types";

export const WATCH_ALLEY_MESSENGER_USERNAME = "thewatchalley";

export const WATCH_ALLEY_WHATSAPP_BUSINESS = {
  e164: "+639206332503",
  display: "+63 920 633 2503",
  waNumber: "639206332503",
} as const;

const GENERAL_INQUIRY_MESSAGE =
  "Hi Watch Alley! I was browsing your website and I'd love to learn more about your available pieces. Could you help me find the right watch?";

/**
 * Messenger's m.me `?text=` parameter does not reliably decode non-ASCII.
 * Keep shared inquiry drafts ASCII-safe so Messenger and WhatsApp stay matched.
 */
export function toContactSafeText(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/[•‣◦⁃]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/₱/g, "PHP");
}

export function buildGeneralInquiryMessage(): string {
  return toContactSafeText(GENERAL_INQUIRY_MESSAGE);
}

export function buildWatchInquiryMessage(
  watch: Watch,
  fullTitle: string,
  listingUrl?: string
): string {
  const ref = watch.reference?.trim();
  const title =
    ref && !fullTitle.toLowerCase().includes(ref.toLowerCase())
      ? `${fullTitle} (Ref. ${ref})`
      : fullTitle;

  const isReserved = watch.status === "reserved";
  const lines = [
    "Hi Watch Alley! I saw this listing on your website and I'm interested:",
    "",
    `- ${title}`,
    `- Price: PHP ${watch.price.toLocaleString("en-PH")}`,
  ];

  if (isReserved) lines.push("- Status: Currently reserved");
  if (listingUrl) lines.push(`- Listing: ${listingUrl}`);

  lines.push(
    "",
    isReserved
      ? "If the reservation is released, could you let me know? Thank you!"
      : "Is this still available? Thank you!"
  );

  return toContactSafeText(lines.join("\n"));
}

export function buildMessengerUrl(message = buildGeneralInquiryMessage()): string {
  return `https://m.me/${WATCH_ALLEY_MESSENGER_USERNAME}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppUrl(message = buildGeneralInquiryMessage()): string {
  return `https://wa.me/${WATCH_ALLEY_WHATSAPP_BUSINESS.waNumber}?text=${encodeURIComponent(
    message
  )}`;
}

export function buildWatchMessengerUrl(
  watch: Watch,
  fullTitle: string,
  listingUrl?: string
): string {
  return buildMessengerUrl(buildWatchInquiryMessage(watch, fullTitle, listingUrl));
}

export function buildWatchWhatsAppUrl(
  watch: Watch,
  fullTitle: string,
  listingUrl?: string
): string {
  return buildWhatsAppUrl(buildWatchInquiryMessage(watch, fullTitle, listingUrl));
}
