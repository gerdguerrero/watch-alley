---
name: The Watch Alley
description: Heritage-craft watch dealer for Filipino collectors. Atelier warmth in dark walnut and brass.
colors:
  walnut-deep: "oklch(0.13 0.012 55)"
  walnut: "oklch(0.17 0.015 55)"
  walnut-card: "oklch(0.21 0.018 60)"
  paper: "oklch(0.92 0.018 80)"
  cream: "#ece4d3"
  cream-80: "rgba(236,228,211,0.85)"
  cream-60: "rgba(236,228,211,0.60)"
  gold: "#c9a24b"
  gold-amber: "oklch(0.78 0.13 75)"
  gold-30: "rgba(201,162,75,0.30)"
  gold-20: "rgba(201,162,75,0.20)"
  ink-paper: "oklch(0.28 0.02 60)"
  ink-paper-soft: "oklch(0.32 0.02 60)"
  alert: "oklch(0.55 0.14 25)"
typography:
  display:
    fontFamily: "Petrona, Georgia, serif"
    fontSize: "clamp(36px, min(7.5vw, 13vh), 88px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Petrona, Georgia, serif"
    fontSize: "clamp(28px, 4vw, 48px)"
    fontWeight: 500
    lineHeight: 1.1
  title:
    fontFamily: "Petrona, Georgia, serif"
    fontSize: "clamp(20px, 2.4vw, 26px)"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0.01em"
  body-italic:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
    fontStyle: "italic"
    lineHeight: 1.55
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "10px"
    fontWeight: 500
    letterSpacing: "0.22em"
    textTransform: "uppercase"
rounded:
  none: "0"
  hairline: "2px"
  sm: "4px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "20px"
  lg: "32px"
  xl: "clamp(48px, 8vw, 96px)"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.walnut-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "20px 32px"
  button-primary-hover:
    backgroundColor: "#d4ae5e"
    textColor: "{colors.walnut-deep}"
  button-ghost:
    backgroundColor: "rgba(236,228,211,0.06)"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "20px 32px"
  chip:
    backgroundColor: "rgba(201,162,75,0.06)"
    textColor: "{colors.gold}"
    typography: "{typography.label}"
    padding: "5px 12px"
    rounded: "{rounded.none}"
  callout-error:
    backgroundColor: "oklch(0.30 0.06 25 / 0.10)"
    textColor: "oklch(0.78 0.13 25)"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
  callout-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-paper}"
    typography: "{typography.body}"
    padding: "clamp(28px, 4vw, 40px) clamp(22px, 4vw, 36px)"
    rounded: "{rounded.none}"
  watch-card:
    backgroundColor: "{colors.walnut-card}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "0"
  ledger-row:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "clamp(18px, 2.5vw, 24px) 0"
---

## Overview

The Watch Alley reads like a Filipino atelier in Escolta after dusk: paper, oil-finished walnut, brass fittings, a hand-painted shop sign. Auction-house catalog warmth, not crypto neon, not Shopify default, not eBay urgency. The voice is *considered, warm, curated*. Restraint outsells flash; photography does the heavy lifting; every detail signals trust.

The system is dark, but **warm dark**. Walnut and espresso, never navy or cyan. A single brass-honey accent does the highlighting. A "paper" surface enters sparingly for callouts, confirmation slips, and the Viber band: those moments earn light to feel personal, like a handwritten note from the watchmaker.

Anti-references: SaaS feature-card grids, gradient text, "modern dashboard" glassmorphism, side-stripe callouts, neon glows under buttons. None of those belong here.

## Colors

OKLCH everywhere with backwards-compatible aliases on legacy `--navy-*` tokens, so the codebase doesn't fork while the warmth deepens.

- `walnut-deep` `oklch(0.13 0.012 55)` is the page ground — interior of a workshop at dusk.
- `walnut` and `walnut-card` are tonal layers, never shadowed cards.
- `paper` `oklch(0.92 0.018 80)` is a deliberate light-tone callout: the inquiry confirmation slip, the Viber band, error wrappers. **Use it sparingly.** Paper that appears everywhere is just a light theme.
- `cream` is the body type tone — `#ece4d3`, slightly warm. Never `#fff`.
- `gold` `#c9a24b` is the accent. Drift toward `gold-amber` (`oklch(0.78 0.13 75)`) for richer surfaces and italics. The gold lives at ≤10% of any view.
- `ink-paper` is the body type *on* paper. Never use cream on paper or gold on paper for body text.
- `alert` is reserved for the error callout. No other red on the page.

**Never use `#000` or `#fff`.** Tint every neutral toward walnut.

## Typography

- **Display: Petrona** (Anton Koovit, Google Fonts). Wedge serif with character. Italic style preferred for emphasis spans (`<em class="gold">` over the headline).
- **Body: Spectral** (Production Type, Google Fonts). Italic Spectral at 13–14px replaces uppercase mono labels longer than 24 characters.
- **Labels: JetBrains Mono.** Reserved for short metadata (≤24 chars). Anything longer drops to Spectral italic body, never long uppercase mono.

Hierarchy is scale + weight, not color. Scale ratio holds at ≥1.25 between steps. Body line length capped at 65–75ch. Light-on-dark gets 0.05–0.10 extra `line-height` to compensate for perceived weight.

**Reflex-reject fonts (banned for this project):** Inter, Playfair Display, Fraunces, Newsreader, Lora, Crimson, Cormorant, DM Sans/Serif, Outfit, Plus Jakarta, Instrument, Syne, IBM Plex, Space Mono, Space Grotesk.

## Elevation

The system is **flat with rules, not layered with shadows.** Hierarchy comes from thin gold rules (`1px solid var(--gold-20)`), generous spacing, and tonal walnut layers (`walnut-deep` → `walnut` → `walnut-card`).

Cards are *not* the default container. Use a card only when elevation actually communicates hierarchy. Nested cards are always wrong. The Sold Archive is a ledger of bordered rows, not a grid of greyed-out cards. The trust band is a single ledger line, not four boxes.

The two surfaces that earn shadow:
- **Inquiry success slip** carries an inset 1px paper highlight + a soft drop-shadow that suggests a card laid on the desk. Single use.
- **Hero featured card** sits over the video, single soft shadow plus its own 1px gold border.

No glow under buttons. No bright glassmorphism. No box-shadow used decoratively.

## Components

### Buttons

- `button-primary` is the only solid-fill button on the page. Gold ground, walnut text, no rounded corners, label-mono type. On hover it shifts one pixel up with a 1px inner highlight; **no colored glow under it** (that's a banned AI-template tell).
- `button-ghost` is the cream outline with a subtle cream-tinted ground. No `backdrop-filter` blur — the original blur was invisible against the page background.
- The hero carries one primary button only. Secondary actions become quiet Spectral-italic text links (`hero-cta-quiet`), not a second outlined button.

### Callouts

All callouts use **full thin borders + faint background tints + a `.mono` eyebrow.** No `border-left` stripes — that's an absolute ban.

- `callout-error` (`.inquiry-error`): full 1px border in muted brick, brick-tinted ground, generated `Couldn't send` eyebrow via `::before`.
- `callout-paper` (`.inquiry-success`): the atelier handwritten note. Paper ground, ink-paper type, 1px gold border, `.mono` eyebrow with the reference ID, single Petrona italic line, Spectral note in the watchmaker's voice, signoff "— The Watch Alley." This is the peak-end of the funnel and earns its own treatment.
- `product-modal-sold-note`: full thin gold-20 border on a faint gold-tinted ground.

### Cards and rows

- `watch-card`: editorial portrait card with a numbered `.watch-num` overlay. Lives in a horizontal carousel, not a grid.
- `ledger-row` (`.sold-card`): the Sold Archive entry. 56px image marginalia, brand+ref label, Petrona name, sold price (italic gold) + month (mono) at the right. Single 1px gold-20 border-bottom. Renders as a record, not a tombstone.

### Trust band

A single horizontal ledger line under the hero. Petrona figures with `font-variant-numeric: oldstyle-nums`, mono labels underneath, generous gap. No card chrome. Replaces what was a four-box grid inside the hero.

## Do's and Don'ts

### Do

- Use full borders + tints for emphasis. Lead with a `.mono` eyebrow in markup if the callout needs a label.
- Animate `transform` and `opacity`. Use exponential ease-out (`cubic-bezier(0.22, 1, 0.36, 1)` or `cubic-bezier(0.16, 1, 0.3, 1)`).
- Treat paper as a deliberate appearance, not a theme. Confirmation slips, Viber band, callouts only.
- Cap body line length at 65–75ch. Drop uppercase to title-case Spectral italic at 24+ characters.
- Frame sold pieces as provenance, not loss. Show sold price, sold month, named in Petrona.
- Reply within four hours, Mon–Sat — that promise is the brand voice. Echo it on the inquiry form, the success slip, and the ticker.
- Use OKLCH for new color decisions. Reduce chroma toward extremes.

### Don't

- **No `border-left`** colored stripes on cards, callouts, or alerts. Absolute ban.
- **No gradient text.** Single solid color; emphasis via weight and scale.
- **No glassmorphism for decoration.** A real glass surface (over a video) can survive; decorative blurs cannot.
- **No neon glow under buttons.** No `box-shadow: 0 8px 32px rgba(gold, 0.35)`. Tactile lift via `transform: translateY(-1px)` instead.
- **No layout-property animation.** Don't transition `padding`, `margin`, `width`, `height`, `top`, `left`. Animate `transform` and `opacity` only. (1px decorative rules animating `width` from 0 → fill are the single allowed exception.)
- **No reflex fonts.** No Inter, Playfair, Fraunces, Outfit, Plus Jakarta, IBM Plex, Space Mono. Petrona + Spectral + JetBrains Mono is the project's commitment.
- **No long uppercase body.** Mono caps survive only at ≤24 characters. Anything longer drops to Spectral italic.
- **No 3-equal-card feature rows.** No icon-tile-stack above headings. No hero-metric template (big number / small label / supporting stats / gradient accent).
- **No #000 or #fff.** Always tint neutrals toward walnut.
- **No em dashes.** Use commas, colons, semicolons, periods, or parentheses.
- **No false urgency.** No countdowns, no scarcity badges, no auction-style timers. Restraint outsells flash.
