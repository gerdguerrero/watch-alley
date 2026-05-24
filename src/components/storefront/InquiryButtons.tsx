"use client";

import { useCallback } from "react";
import type { Watch } from "@/lib/inventory/types";

const MESSENGER_URL = "https://m.me/thewatchalley";

function buildInquiryMessage(watch: Watch): string {
  return (
    watch.inquiryBody ||
    `Hi Watch Alley, I'm interested in the ${watch.brand} ${watch.name}${
      watch.reference ? ` (${watch.reference})` : ""
    }. Could you share current availability, condition photos, and included set details?`
  );
}

function buildMailtoHref(watch: Watch): string {
  const subject = watch.inquirySubject || `Inquiry: ${watch.brand} ${watch.name}`;
  const body = buildInquiryMessage(watch);
  return `mailto:hello@watchalley.ph?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

interface InquiryButtonsProps {
  watch: Watch;
}

export function InquiryButtons({ watch }: InquiryButtonsProps) {
  const handleMessengerClick = useCallback(() => {
    const message = buildInquiryMessage(watch);
    navigator.clipboard.writeText(message).catch(() => {});
    window.open(MESSENGER_URL, "_blank", "noopener,noreferrer");
  }, [watch]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={handleMessengerClick}
          className="inline-flex items-center justify-center gap-3 bg-amber-500 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-900 transition-colors hover:bg-amber-400 cursor-pointer"
        >
          Message the Seller
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M1 11L11 1M11 1H3M11 1V9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <a
          href={buildMailtoHref(watch)}
          className="inline-flex items-center justify-center gap-3 border border-zinc-700 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          Email inquiry
        </a>
      </div>
      <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.16em]">
        Inquiry copied to clipboard — paste in Messenger
      </p>
    </div>
  );
}
