# Watch Alley — Design Context

## Design Context

### Users

Filipino watch collectors browsing primarily on mobile, often in the evening at home. The audience splits into two:

- **Serious collectors** — already know references, conditions, and price bands. They want trust signals (authentic, well-photographed, honest disclosure) and to inquire fast through their preferred channel (Viber, WhatsApp, email).
- **Aspiring buyers** — drawn to the visual desire of a curated drop. They need the listing to teach them what makes a piece special and make the inquiry frictionless.

The job they're trying to get done: *decide whether this seller is trustworthy and this watch is worth pursuing — within 1-2 minutes of arrival.*

Context is intimate and considered, not impulsive. People don't buy a watch like they buy a t-shirt.

### Brand Personality

**Heritage craft / atelier.** Warm, tactile, made-by-hand. The feel of a Filipino atelier — paper-and-leather, oil-finished walnut, brass fittings, hand-painted shop sign. Tells stories about each watch.

Three words: **considered · warm · curated**.

Emotional goals: *quiet confidence*, *trust earned through restraint*, *the satisfaction of a well-made object*.

### Aesthetic Direction

**Anti-references — what this is NOT:**

- ❌ Generic ecommerce (Shopify default product grids, Add-to-Cart buttons, sale badges everywhere)
- ❌ Crypto/fintech (dark mode + cyan/neon accents, gradient buttons, "modern SaaS")
- ❌ Loud marketplace (eBay/Carousell — auction urgency, cramped layouts, multiple competing CTAs)
- ❌ Trendy AI-design (purple-to-blue gradients, glassmorphism, generic 2024-2025 "modern" visuals)

**Reference vibe:** Auction-house catalog warmth. A leather-bound watchmaker's notebook. A Filipino atelier in Escolta with a painted shop sign. A 1960s Seiko technical manual. Hodinkee's photography discipline crossed with the warmth of a paper magazine.

**Theme:** Dark — but **warm dark**, not navy/blue dark. Move toward walnut, espresso, oil-finish brown rather than the current `--navy-deep`. The interior of a watchmaker's workshop at dusk, lit by a single brass lamp.

**Typography:** Refresh both display and body away from Playfair Display + Inter. Pick a pairing with character that reads as *crafted* rather than *templated*.

- **Display: Petrona** — wedge serif by Anton Koovit (Google Fonts). Atypical proportions, warmth, soul. Not the default Playfair reach. Reads like a hand-cut sign rather than a set sample.
- **Body: Spectral** — Production Type, made for screens (Google Fonts). Editorial gravitas, holds up at small sizes, pairs with Petrona by sharing serif DNA.
- **Labels (mono):** Keep JetBrains Mono for now — labels are minimal enough that the swap is low-leverage today. Revisit if the dev-tool association ever feels off-brand.

**Color — directional shift, not a rebuild.** Stay on the existing `--gold / --cream / --ink` token system, but tint warmer over time:

- Backgrounds shift from navy toward walnut (`oklch(0.18 0.015 50)` zone)
- Cream text remains, slightly warmer
- Gold accent shifts from bright to amber/honey (`oklch(0.78 0.13 75)` zone)
- A "paper" surface tone enters for callouts and cards used sparingly

### Design Principles

1. **Restraint outsells flash.** Quiet confidence beats loud claims. Empty space is a feature, not waste.
2. **Photography does the heavy lifting.** Layout and type get out of the way. The watches are the art.
3. **Every detail signals trust.** Honest disclosure copy, full-resolution photos, named provenance, clear pricing. No false urgency, no fake scarcity badges.
4. **Mobile is the primary canvas.** Filipino buyers are on phones. Test at 375px first; desktop is the sub-experience.
5. **Heritage means warmth, not antiques.** Modern type and code, modern performance, warm tones and tactile detail. A workshop today, not a museum exhibit.

---

## Banned patterns (per impeccable skill) reaffirmed for this project

- No `border-left:` colored stripes on cards/callouts/listings.
- No gradient text (`background-clip: text` with a gradient fill).
- No purple-to-blue gradients anywhere.
- No glassmorphism for decoration.
- No bouncy/elastic easing.
- No reflex fonts: Playfair Display, Fraunces, Newsreader, Lora, Crimson, Cormorant, Inter, DM Sans/Serif, Outfit, Plus Jakarta, Instrument, Syne, IBM Plex, Space Mono, Space Grotesk.
