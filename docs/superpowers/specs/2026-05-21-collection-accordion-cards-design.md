# Collection Section — Accordion Cards Design

**Date:** 2026-05-21  
**Status:** Approved

## Overview

Replace the existing 3-column grid in `CollectionSection` with a horizontal accordion card layout. Cards are narrow strips by default; hovering (desktop) or clicking (mobile) expands one card to fill available width while others collapse.

## Reference

User-provided screenshots showing the Prisma-style accordion: pill-shaped collapsed cards, one wide active card, image backgrounds, icon + name + category at bottom of active card.

## Layout

- Container: full-width flex row, `h-[580px]`, `gap-3`, `overflow-hidden`
- Background: `#0a0a0a` (unchanged)
- Cards inset with `px-6 md:px-12 lg:px-20` (same as current section padding)

## Card States

### Collapsed
- `flex: 1` → ~90px wide
- `rounded-[28px]`, full height
- Watch image as `object-cover` background
- Subtle dark overlay `rgba(0,0,0,0.4)`
- Centered circular icon button at bottom (`w-12 h-12`, white bg, dark icon)
- No text

### Expanded
- `flex: 5` → takes remaining horizontal space
- Same border radius, same image bg
- Strong bottom gradient: `linear-gradient(to top, rgba(0,0,0,0.85) 35%, transparent)`
- Bottom-left content:
  - Circular icon button (`w-12 h-12`, white bg, dark icon)
  - Watch **Name** — `text-4xl md:text-5xl font-light text-white`
  - **Category** — `text-xs tracking-[0.2em] uppercase text-zinc-400`
- Gold accent line (`w-8 h-px bg-amber-500/60`) above name

## Animation

- `flex` animates via Framer Motion `animate` prop
- Duration: `0.65s`, ease: `[0.22, 1, 0.36, 1]`
- Expanded text content: `opacity 0→1`, `y 10→0`, `delay: 0.2s`
- Collapsed icon: `opacity 0→1`, `delay: 0.1s`

## Trigger

- Desktop: `onMouseEnter` → expand
- Mobile (`isMobile` hook): `onClick` → toggle (clicking active card keeps it open)

## Mobile Layout

Vertical accordion:
- Container: `flex-col`, `h-auto`
- Collapsed card: `h-20`, full width, rounded pill
- Expanded card: `h-[340px]`, full width
- Icon + text always bottom-left when expanded

## Component Scope

Single file change: `components/collection-section.tsx`

- Remove `CollectionCard` grid variant
- Add `useIsMobile` from existing `hooks/use-mobile.ts`
- Keep section header, filter pills, ambient glow — unchanged
- Keep existing `collections` data array — unchanged (images stay as remote URLs)
- Add unique Lucide icon per watch (e.g. `Watch`, `Timer`, `Compass`)

## Icons per Card

| Watch | Icon |
|-------|------|
| Perpetual | `Watch` |
| Chronograph | `Timer` |
| Tourbillon | `Compass` |
