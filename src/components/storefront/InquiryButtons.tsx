"use client";

import { useCallback } from "react";
import type { Watch } from "@/lib/inventory/types";

const MESSENGER_USERNAME = "thewatchalley";

/**
 * Messenger's m.me `?text=` parameter does not reliably decode non-ASCII -
 * emojis, the peso sign (₱), curly quotes and en/em dashes all render as � in
 * the compose box. Fold everything down to ASCII so the prefilled message is
 * always clean, regardless of what punctuation a listing's title contains.
 */
function toAscii(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/[•‣◦⁃]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/₱/g, "PHP");
}

/**
 * Per-watch inquiry message, prefilled into Messenger via the `text` parameter
 * of an m.me link (officially supported - it lands in the compose box so the
 * buyer just hits send). No AI: a template populated from live watch fields
 * (title, ref, price, listing URL), so every new listing automatically gets a
 * curated message with zero manual work. The legacy manual `inquiry_body`
 * override was removed (admin field deleted) - every listing uses this format.
 */
function buildInquiryMessage(watch: Watch, fullTitle: string, listingUrl?: string): string {
  // `fullTitle` is "Brand + clean name". Only append the reference when it
  // isn't already spelled out in the name (these listings usually embed it).
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

  return toAscii(lines.join("\n"));
}

function buildMessengerUrl(watch: Watch, fullTitle: string, listingUrl?: string): string {
  const text = buildInquiryMessage(watch, fullTitle, listingUrl);
  return `https://m.me/${MESSENGER_USERNAME}?text=${encodeURIComponent(text)}`;
}

interface InquiryButtonsProps {
  watch: Watch;
  /** Clean "Brand + name" title (brand-deduped) as shown in the page heading. */
  title: string;
}

export function InquiryButtons({ watch, title }: InquiryButtonsProps) {
  // Server-render a working href from the watch data alone (no-JS / middle-click
  // safe). On click we upgrade it in place to include the live page URL, so the
  // seller receives the exact listing link - without risking a hydration mismatch.
  const upgradeWithLiveUrl = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === "undefined") return;
      event.currentTarget.href = buildMessengerUrl(watch, title, window.location.href);
    },
    [watch, title]
  );

  return (
    <a
      href={buildMessengerUrl(watch, title)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={upgradeWithLiveUrl}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-950 transition-colors hover:bg-amber-400"
    >
      Message the Seller
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M1 11L11 1M11 1H3M11 1V9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
