import type { Watch } from "./types";

const HIDDEN_WATCH_IDS = new Set<string>([]);

const WATCH_OVERRIDES: Record<string, Partial<Watch>> = {
  "gs-sbgx261-01": {
    model: "SBGX261 Heritage Quartz",
    featured: true,
    images: ["/watch-assets/gs-sbgx261.png"],
    inquirySubject: "Inquiry: GRAND SEIKO SBGX261 HAQ Black Dial",
    inquiryBody:
      "Hi Watch Alley, I'm interested in the Grand Seiko SBGX261 HAQ Black Dial (PHP 68,500). Could you confirm current availability, condition photos, and full set details?",
  },
  "tudor-bb58-01": {
    images: ["/watch-assets/tudor-bb58-gilt.png"],
    inquirySubject: "Inquiry: TUDOR Black Bay 58 Gilt",
    inquiryBody:
      "Hi Watch Alley, I'm interested in the Tudor Black Bay 58 Gilt (PHP 145,000). Could you confirm current availability, condition photos, and set inclusions?",
  },
  "seiko-spb143-01": {
    images: ["/watch-assets/seiko-spb143.png"],
    inquirySubject: "Inquiry: SEIKO PROSPEX SPB143 62MAS Reissue",
    inquiryBody:
      "Hi Watch Alley, I'm interested in the Seiko Prospex SPB143 62MAS Reissue (PHP 42,000). Could you confirm current availability, condition photos, and set inclusions?",
  },
  "twa-004": {
    model: 'Alpinist "Whiskered Pitta" SPB491J1',
    reference: "SPB491J1",
    primaryImage: "/watch-assets/alpinist.png",
    images: ["/watch-assets/alpinist.png", "/watch-assets/alpinist-alt.png"],
    soldAt: "",
    soldPrice: null,
    featured: false,
  },
  "seiko-srpd55-01": {
    images: ["/watch-assets/seiko-srpd55.png"],
    inquirySubject: "Inquiry: SEIKO 5 Sports SRPD55K1 5KX",
    inquiryBody:
      "Hi Watch Alley, I'm interested in the Seiko 5 Sports SRPD55K1 5KX (PHP 9,500). Could you confirm current availability, condition photos, and inclusions?",
  },
  "rolex-dj1601-01": {
    images: ["/watch-assets/rolex-dj1601.png"],
  },
};

export function curateWatch(watch: Watch): Watch | null {
  if (HIDDEN_WATCH_IDS.has(watch.id)) return null;

  const override = WATCH_OVERRIDES[watch.id] ?? {};
  const next = { ...watch, ...override };
  const primaryImage = next.primaryImage || next.images[0] || "";
  const images = next.images.length > 0 ? next.images : primaryImage ? [primaryImage] : [];

  if (!primaryImage) return null;

  return {
    ...next,
    primaryImage,
    images,
  };
}

export function curateWatches(watches: Watch[]): Watch[] {
  return watches.map(curateWatch).filter((watch): watch is Watch => watch !== null);
}

export function isHiddenWatchId(id: string): boolean {
  return HIDDEN_WATCH_IDS.has(id);
}
