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
  // --- Approved Drive exports (canonical UI chrome) ------------------------
  /** Square display-picture lockup from drive-assets/PNG/Copy of DP FLAT.png. */
  twaIcon: "/brand/logo-dp-flat.png",
  /** Square display-picture lockup, used anywhere a badge/app icon is needed. */
  twaBadge: "/brand/logo-dp-flat.png",
  /** Circular favicon/app badge derived from the approved transparent lockup. */
  twaBadgeCircle: "/brand/logo-dp-flat-circle.png",
  /** Primary transparent lockup for dark UI surfaces. */
  twaPrimary: "/brand/logo-on-black.png",
  /** Wordmark + compass in solid gold. */
  twaGold: "/brand/logo-gold.png",
  /** Wordmark + compass in white. */
  twaWhite: "/brand/logo-white.png",
  /** Broad reproduction fallback. */
  monochrome: "/brand/logo-on-white.png",
  /** Compact lockup for nav/footer slots. */
  inline: "/brand/logo-on-black.png",
  /** Full lockup for wider chrome slots. */
  horizontal: "/brand/logo-on-black.png",

  // --- Raster variants (kept for parity / legacy callers) ------------------
  logoGold: "/brand/logo-gold.png",
  logoWhite: "/brand/logo-white.png",
  logoDp: "/brand/logo-dp.png",
  logoDpFlat: "/brand/logo-dp-flat.png",
  logoDpFlatCircle: "/brand/logo-dp-flat-circle.png",
  logoOnBlack: "/brand/logo-on-black.png",
  logoOnWhite: "/brand/logo-on-white.png",

  // --- Photographic assets (heroes, OG cards, section backgrounds) ---------
  backgroundOne: "/brand/background-1.webp",
  backgroundTwo: "/brand/background-2.webp",
  backgroundThree: "/brand/background-3.webp",
  coverPhoto: "/brand/cover-photo.png",
  socialMockup: "/brand/social-mockup.png",
  socialDp: "/brand/social-dp.png",
  socialDpFlat: "/brand/social-dp-flat.png",
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
