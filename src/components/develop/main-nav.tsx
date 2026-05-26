"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { HorologicalLogo } from "./horological-logo";
import { type MobileNavLink, MobileNavOverlay } from "./mobile-nav-overlay";

export function MainNav() {
  const pathname = usePathname() || "";
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Trigger ref so the overlay's outside-click handler can ignore clicks on
  // the hamburger itself; without this, clicking the trigger while the
  // dropdown is open closes-then-reopens it in the same gesture.
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Section links styling for the desktop bar.
  const linkClass = (active: boolean) =>
    `text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-mono transition-colors ${
      active ? "text-[color:var(--color-gold)] font-medium" : "text-cream-60 hover:text-cream"
    }`;

  // Mirror of the desktop section links for the mobile overlay.
  const overlayLinks: MobileNavLink[] = [
    { label: "Available", href: "/available" },
    { label: "Sold", href: "/sold" },
    { label: "Heritage", href: "/heritage" },
    { label: "Journal", href: "/journal" },
  ];

  // Inquire pill opens Messenger with a pre-filled draft message. Same `?text=`
  // pattern used by src/components/storefront/InquiryButtons.tsx — the visitor
  // still has to tap Send, but the body is already typed for them.
  // NOTE: Facebook's m.me ?text= parameter does not reliably decode UTF-8
  // emojis (both 👋 4-byte SMP and ⌚ 3-byte BMP rendered as � in testing).
  // Keep the template ASCII-only.
  const INQUIRE_TEMPLATE =
    "Hi! I visited The Watch Alley website and I'm interested in your collection. Could you share more details?";
  const inquireHref = `https://m.me/thewatchalley?text=${encodeURIComponent(INQUIRE_TEMPLATE)}`;

  return (
    <motion.header
      className="fixed top-2 left-0 right-0 z-50 px-3 md:top-3 md:px-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`relative mx-auto max-w-6xl items-center border border-amber-400/15 bg-[#090806]/88 px-4 shadow-[0_14px_42px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-all duration-500 ease-out sm:px-5 md:px-6 flex justify-between gap-3 ${
          isScrolled ? "rounded-xl py-1.5 max-w-5xl" : "rounded-2xl py-2 md:py-2.5"
        }`}
      >
        {/* Left: Full brand lockup (compass + wordmark in one SVG). The
            primary lockup contains the wordmark, so no adjacent text node —
            avoids the duplicate-wordmark stutter that the previous
            badge-plus-text arrangement had. */}
        <Link
          href="/"
          aria-label="The Watch Alley home"
          className="flex items-center group flex-shrink-0"
        >
          <HorologicalLogo
            mode="hover-sweep"
            width={isScrolled ? 46 : 56}
            height={isScrolled ? 34 : 42}
            className="transition-all duration-500"
          />
        </Link>

        {/* Middle: Section Links (hidden on phone, visible lg+) */}
        <div className="hidden items-center gap-5 lg:flex lg:gap-6">
          <Link href="/available" className={linkClass(pathname === "/available")}>
            Available
          </Link>
          <Link href="/sold" className={linkClass(pathname === "/sold")}>
            Sold
          </Link>
          <Link href="/heritage" className={linkClass(pathname === "/heritage")}>
            Heritage
          </Link>
          <Link href="/journal" className={linkClass(pathname.startsWith("/journal"))}>
            Journal
          </Link>
        </div>

        {/* Right: Hamburger (mobile) + Locale + Inquire */}
        <div className="flex items-center justify-end gap-2 md:gap-5 flex-shrink-0">
          <button
            ref={menuTriggerRef}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/20 text-cream lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none">
              <title>Menu</title>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-gold)] hidden md:inline">
            EN · ₱ PHP
          </span>
          <a
            href={inquireHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group hidden lg:inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-300 transition-all duration-300 hover:border-amber-300/60 hover:bg-amber-300 hover:text-[#090806] md:gap-2 md:px-4 md:py-1.5"
          >
            <span>Inquire</span>
            <svg
              className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <title>Arrow</title>
              <path
                d="M1 11L11 1M11 1H3M11 1V9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        <MobileNavOverlay
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          links={overlayLinks}
          inquireHref={inquireHref}
          triggerRef={menuTriggerRef}
        />
      </div>
    </motion.header>
  );
}
