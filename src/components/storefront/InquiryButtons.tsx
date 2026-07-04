"use client";

import { MessageCircle, Send } from "lucide-react";
import { type MouseEvent, useCallback } from "react";
import {
  buildWatchInquiryMessage,
  buildWatchMessengerUrl,
  buildWatchWhatsAppUrl,
  WATCH_ALLEY_WHATSAPP_BUSINESS,
} from "@/lib/contact";
import type { Watch } from "@/lib/inventory/types";

/**
 * Per-watch inquiry message, prefilled into Messenger and WhatsApp via shared
 * contact helpers. No AI: a template populated from live watch fields (title,
 * ref, price, listing URL), so every new listing automatically gets a curated
 * message with zero manual work. The legacy manual `inquiry_body` override was
 * removed (admin field deleted) - every listing uses this format.
 */
function getVisitorUid() {
  try {
    let uid = localStorage.getItem("wa_uid") || "";
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem("wa_uid", uid);
    }
    return uid;
  } catch {
    return "";
  }
}

function trackInquiryIntent(
  watch: Watch,
  fullTitle: string,
  targetUrl: string,
  listingUrl: string
) {
  const messageText = buildWatchInquiryMessage(watch, fullTitle, listingUrl);
  const payload = JSON.stringify({
    watchId: watch.id,
    watchSlug: watch.slug,
    watchTitle: fullTitle,
    watchReference: watch.reference,
    watchPricePhp: watch.price,
    watchStatus: watch.status,
    messageText,
    targetUrl,
    sourcePath: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || "",
    visitorUid: getVisitorUid(),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/track-inquiry-intent", blob);
    return;
  }

  fetch("/api/track-inquiry-intent", {
    method: "POST",
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

interface InquiryButtonsProps {
  watch: Watch;
  /** Clean "Brand + name" title (brand-deduped) as shown in the page heading. */
  title: string;
}

export function InquiryButtons({ watch, title }: InquiryButtonsProps) {
  // Server-render a working href from the watch data alone (no-JS / middle-click
  // safe). On click we upgrade each channel in place to include the live page
  // URL, so the seller receives the exact listing link - without risking a
  // hydration mismatch.
  const upgradeMessengerWithLiveUrl = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === "undefined") return;
      const listingUrl = window.location.href;
      const messengerUrl = buildWatchMessengerUrl(watch, title, listingUrl);
      event.currentTarget.href = messengerUrl;
      trackInquiryIntent(watch, title, messengerUrl, listingUrl);
    },
    [watch, title]
  );

  const upgradeWhatsAppWithLiveUrl = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === "undefined") return;
      event.currentTarget.href = buildWatchWhatsAppUrl(watch, title, window.location.href);
    },
    [watch, title]
  );

  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      <a
        href={buildWatchMessengerUrl(watch, title)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={upgradeMessengerWithLiveUrl}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-950 transition-colors hover:bg-amber-400"
      >
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        Messenger
      </a>
      <a
        href={buildWatchWhatsAppUrl(watch, title)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={upgradeWhatsAppWithLiveUrl}
        aria-label={`Message The Watch Alley on WhatsApp Business at ${WATCH_ALLEY_WHATSAPP_BUSINESS.display}`}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#6f9f82]/45 bg-[#132a20]/70 px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c5d8ca] transition-colors hover:border-[#a6c8b1] hover:bg-[#8fb99e] hover:text-zinc-950"
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        WhatsApp Business
      </a>
    </div>
  );
}
