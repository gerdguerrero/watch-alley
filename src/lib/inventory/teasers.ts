/**
 * Homepage "Available Pieces" teaser selection. Pure functions - picking runs
 * on the server (in the home page) so only the three chosen watches, not the
 * whole catalog, are serialized into the Client accordion.
 *
 * Each card is labelled by category/tag, not by the watch itself; the watch is
 * only a representative hero image whose card links to the matching filtered
 * catalog grid.
 */
import type { Watch } from "./types";

export interface CollectionTeaser {
  watch: Watch;
  label: string;
  href: string;
}

interface TeaserSlot {
  label: string;
  href: string;
  /** A watch qualifies for this slot when this predicate holds. */
  match: (w: Watch) => boolean;
}

// "Limited Edition" is a badge/tag, NOT a category - so it matches on `badges`,
// while Brand New / Pre-owned match on `category`. The badge route reuses the
// catalog's `category=limited-edition` param, which /available maps to a badge
// filter.
const TEASER_SLOTS: readonly TeaserSlot[] = [
  {
    label: "Brand New",
    href: "/available?category=brand-new",
    match: (w) => w.category === "brand-new",
  },
  {
    label: "Pre-owned",
    href: "/available?category=pre-owned",
    match: (w) => w.category === "pre-owned",
  },
  {
    label: "Limited Edition",
    href: "/available?category=limited-edition",
    match: (w) => w.badges.includes("limited-edition"),
  },
] as const;

// Pick most-restrictive slot first so a piece that qualifies for several cards
// (e.g. a brand-new limited edition) lands in Limited Edition, leaving Brand
// New a different watch.
const PICK_ORDER = ["Limited Edition", "Pre-owned", "Brand New"] as const;

/**
 * Choose one distinct watch per teaser card. A slot with no genuine match is
 * dropped rather than back-filled with an unrelated piece - the Limited Edition
 * card only ever shows a real limited-edition watch. Cards are returned in the
 * fixed layout order (Brand New, Pre-owned, Limited Edition).
 */
export function pickCollectionTeasers(watches: Watch[]): CollectionTeaser[] {
  const used = new Set<string>();
  const picks: Record<string, Watch> = {};

  for (const label of PICK_ORDER) {
    const slot = TEASER_SLOTS.find((s) => s.label === label);
    if (!slot) continue;
    const match = watches.find((w) => slot.match(w) && !used.has(w.id));
    if (match) {
      picks[label] = match;
      used.add(match.id);
    }
  }

  return TEASER_SLOTS.filter((slot) => picks[slot.label]).map((slot) => ({
    watch: picks[slot.label],
    label: slot.label,
    href: slot.href,
  }));
}
