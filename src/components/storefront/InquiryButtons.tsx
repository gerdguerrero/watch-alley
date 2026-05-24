"use client";

import type { Watch } from "@/lib/inventory/types";

const MESSENGER_USERNAME = "thewatchalley";

function buildInquiryMessage(watch: Watch): string {
  return (
    watch.inquiryBody ||
    `Hi Watch Alley, I'm interested in the ${watch.brand} ${watch.name}${
      watch.reference ? ` (${watch.reference})` : ""
    }. Could you share current availability, condition photos, and included set details?`
  );
}

function buildMessengerUrl(watch: Watch): string {
  const text = buildInquiryMessage(watch);
  return `https://m.me/${MESSENGER_USERNAME}?text=${encodeURIComponent(text)}`;
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
  const messengerUrl = buildMessengerUrl(watch);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3 bg-amber-500 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-900 transition-colors hover:bg-amber-400"
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
        </a>
        <a
          href={buildMailtoHref(watch)}
          className="inline-flex items-center justify-center gap-3 border border-zinc-700 px-8 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        >
          Email inquiry
        </a>
      </div>
    </div>
  );
}
