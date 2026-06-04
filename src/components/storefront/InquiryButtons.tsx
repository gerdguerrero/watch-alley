"use client";

import { useCallback } from "react";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";

const MESSENGER_USERNAME = "thewatchalley";

/**
 * Per-watch inquiry message, prefilled into Messenger via the `text` parameter
 * of an m.me link (officially supported — it lands in the compose box so the
 * buyer just hits send). No AI: a template populated from the watch row, so
 * every new listing automatically gets its own curated message.
 *
 * The template is always generated from live fields (title, ref, price, link)
 * so it can never go stale and every new listing gets a curated message with
 * zero manual work. (The legacy `inquiry_body` column holds inconsistent
 * generic strings — "Is this available?", etc. — so it is intentionally not
 * used here; re-introduce it only once real per-watch overrides are authored.)
 */
function buildInquiryMessage(watch: Watch, fullTitle: string, listingUrl?: string): string {
  // `fullTitle` is "Brand + clean name". Only append the reference when it
  // isn't already spelled out in the name (these listings usually embed it).
  const ref = watch.reference?.trim();
  const title =
    ref && !fullTitle.toLowerCase().includes(ref.toLowerCase())
      ? `${fullTitle} (Ref. ${ref})`
      : fullTitle;

  const lines = [
    "Hi Watch Alley! I saw this listing on your website and I'm interested:",
    "",
    `• ${title}`,
    `• Price: ${formatPhp(watch.price)}`,
  ];

  if (listingUrl) lines.push(`• Listing: ${listingUrl}`);

  lines.push(
    "",
    "Is this still available? Could you share more condition photos and the included set details? Thank you!"
  );

  return lines.join("\n");
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
  // seller receives the exact listing link — without risking a hydration mismatch.
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
