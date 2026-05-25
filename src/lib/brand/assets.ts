/**
 * The Watch Alley brand asset registry.
 *
 * Everything the site references for branding flows through this one map so
 * a future palette refresh or asset rename only touches one file. Prefer the
 * SVG variants for chrome (nav, footer, social mockups) — they stay crisp at
 * any resolution. The PNG/WebP variants are kept for hero/section imagery
 * where the design is photographic.
 */
export const BRAND_ASSETS = {
  // --- SVG marks (preferred for UI chrome — infinite resolution) -----------
  /** Compass mark only, transparent background. Use inside chips, buttons, tight slots. */
  twaIcon: "/brand/twa-logo-icon.svg",
  /** Compass mark inside the walnut + gold-bezel circle. The favicon / "monogram". */
  twaBadge: "/brand/twa-logo-badge.svg",
  /** Full wordmark + compass, gold on transparent. The primary brand lockup. */
  twaPrimary: "/brand/twa-logo-primary.svg",
  /** Wordmark + compass in solid gold. Use on dark surfaces. */
  twaGold: "/brand/twa-logo-gold.svg",
  /** Wordmark + compass in white. Use on photo / dark cinematic surfaces. */
  twaWhite: "/brand/twa-logo-white.svg",
  /** Black-and-white wordmark — single colour, broadest reproduction range. */
  monochrome: "/brand/logo-bw.svg",
  /** Inline (horizontal short) lockup, useful in footers / cramped headers. */
  inline: "/brand/logo-inline.svg",
  /** Full horizontal lockup with serif wordmark. */
  horizontal: "/brand/logo-horizontal.svg",

  // --- Raster variants (kept for parity / legacy callers) ------------------
  logoGold: "/brand/logo-gold.png",
  logoWhite: "/brand/logo-white.png",
  logoDpFlat: "/brand/logo-dp-flat-cropped.png",
  logoOnBlack: "/brand/logo-on-black.png",
  logoOnWhite: "/brand/logo-on-white.png",

  // --- Photographic assets (heroes, OG cards, section backgrounds) ---------
  backgroundOne: "/brand/background-1.webp",
  backgroundTwo: "/brand/background-2.webp",
  backgroundThree: "/brand/background-3.webp",
  coverPhoto: "/brand/cover-photo.png",
  socialMockup: "/brand/social-mockup.webp",
  socialDpFlat: "/brand/social-dp-flat.webp",
} as const;

/**
 * Canonical brand colours. Mirrors the `@theme inline` tokens in globals.css
 * so non-CSS surfaces (meta theme-color, manifest, dynamic OG images, JS
 * canvas, etc.) reference the same values without parsing CSS.
 */
export const BRAND_COLORS = {
  /** Deep walnut — page background / favicon background. */
  walnut: "#13110f",
  /** Flat brand gold — accents, bezels, brand mark fill. */
  gold: "#BD9A32",
  /** Off-white cream — body copy on dark surfaces. */
  cream: "#F1ECE0",
} as const;
