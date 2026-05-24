"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { type MobileNavLink, MobileNavOverlay } from "./mobile-nav-overlay";

export function MainNav() {
  const pathname = usePathname() || "";
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const onHome = pathname === "/";

  // Smooth-scroll to an in-page anchor when we're on the homepage; otherwise
  // let the link navigate to the home route with the hash.
  const handleAnchor = (anchor: string) => (e: MouseEvent) => {
    if (!onHome) return;
    e.preventDefault();
    const target = document.getElementById(anchor);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Section links styling for the desktop bar.
  const linkClass = (active: boolean) =>
    `text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-mono transition-colors ${
      active ? "text-[color:var(--color-gold)] font-medium" : "text-cream-60 hover:text-cream"
    }`;

  // Mirror of the desktop section links for the mobile overlay. Heritage uses
  // the smooth-scroll handler when we're on the homepage.
  const overlayLinks: MobileNavLink[] = [
    { label: "Available", href: "/available" },
    { label: "Sold", href: "/sold" },
    {
      label: "Heritage",
      href: onHome ? "#heritage" : "/#heritage",
      onClick: handleAnchor("heritage"),
    },
    { label: "Journal", href: "/journal" },
  ];

  const inquireHref = onHome ? "#contact" : "/#contact";

  return (
    <motion.header
      className="fixed top-2 left-0 right-0 z-50 px-3 md:top-4 md:px-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`relative mx-auto max-w-7xl items-center border border-amber-400/15 bg-[#090806]/85 px-4 shadow-[0_18px_58px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-500 ease-out sm:px-6 md:px-8 flex justify-between gap-3 ${
          isScrolled ? "rounded-2xl py-2.5 max-w-5xl" : "rounded-3xl py-3 md:py-4"
        }`}
      >
        {/* Left: Logo + Wordmark */}
        <Link
          href="/"
          aria-label="The Watch Alley home"
          className="flex items-center gap-2 md:gap-3 group flex-shrink-0"
        >
          <Image
            src="/brand/logo-dp-flat-cropped.png"
            alt=""
            width={isScrolled ? 30 : 36}
            height={isScrolled ? 30 : 36}
            className="object-contain transition-all duration-500"
            priority
          />
          <span className="font-serif text-[12px] md:text-sm tracking-[0.12em] text-[color:var(--color-cream)] uppercase transition-all duration-500 hidden sm:inline">
            The Watch Alley
          </span>
        </Link>

        {/* Middle: Section Links (hidden on phone, visible lg+) */}
        <div className="hidden items-center gap-5 lg:flex lg:gap-7">
          <Link href="/available" className={linkClass(pathname === "/available")}>
            Available
          </Link>
          <Link href="/sold" className={linkClass(pathname === "/sold")}>
            Sold
          </Link>
          <Link
            href={onHome ? "#heritage" : "/#heritage"}
            onClick={handleAnchor("heritage")}
            className={linkClass(false)}
          >
            Heritage
          </Link>
          <Link href="/journal" className={linkClass(pathname.startsWith("/journal"))}>
            Journal
          </Link>
        </div>

        {/* Right: Hamburger (mobile) + Locale + Inquire */}
        <div className="flex items-center justify-end gap-2 md:gap-5 flex-shrink-0">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
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
          <Link
            href={inquireHref}
            onClick={handleAnchor("contact")}
            className="group hidden lg:inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300 transition-all duration-300 hover:border-amber-300/60 hover:bg-amber-300 hover:text-[#090806] md:gap-2 md:px-5 md:py-2"
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
          </Link>
        </div>

        <MobileNavOverlay
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          links={overlayLinks}
          inquireHref={inquireHref}
          onInquireClick={handleAnchor("contact")}
        />
      </div>
    </motion.header>
  );
}
