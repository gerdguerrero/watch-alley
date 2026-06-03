"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { BrandLogo } from "./brand-logo";

const MotionLink = motion.create(Link);

const FOOTER_LINK_GROUPS = [
  {
    title: "Shop",
    links: [
      { label: "Available", href: "/available" },
      { label: "Sold Archive", href: "/sold" },
    ],
  },
  {
    title: "Editorial",
    links: [
      { label: "Journal", href: "/journal" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/TheWatchAlley",
    // Facebook "f" glyph in a rounded square. Drawn at 24×24 viewBox.
    path: "M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.25-1.5 1.55-1.5H16.5V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.1v2.1H7.5v3H10V21h3.5z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/the.watch.alley/",
    // Camera body + lens + flash dot. Simplified single-path glyph.
    path: "M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3zm0 1.5A3 3 0 0 0 4.5 7.5v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9zM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 1.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5-2.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@the.watch.alley.ph",
    // Stylised TikTok eighth-note with curl.
    path: "M14 3h2.6a4.4 4.4 0 0 0 4.4 4.4V10a7 7 0 0 1-4.4-1.55v6.05a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6.02.9.07v2.65a2.85 2.85 0 1 0 2 2.78V3z",
  },
] as const;

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-amber-400/10 bg-[#080706] px-6 py-10 md:px-12 lg:px-20">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.06] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundOne})` }}
      />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.4fr_1fr_1fr] md:items-start">
        <div>
          <Link href="/" aria-label="The Watch Alley home" className="inline-flex">
            <BrandLogo className="h-16 w-16" sizes="64px" />
          </Link>
          <div className="mt-5 flex items-center gap-3">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 text-cream-60 transition-colors hover:border-amber-300 hover:text-amber-300"
              >
                <span className="sr-only">{`The Watch Alley on ${social.label}`}</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <title>{social.label}</title>
                  <path d={social.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-amber-300/70 font-mono">
              {group.title}
            </p>
            <div className="flex flex-col gap-3">
              {group.links.map((link) => (
                <MotionLink
                  key={link.label}
                  href={link.href}
                  className="text-sm text-cream-60 transition-colors hover:text-cream"
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {link.label}
                </MotionLink>
              ))}
            </div>
          </nav>
        ))}
      </div>

      <div className="relative z-10 mx-auto mt-8 flex max-w-7xl flex-col gap-4 border-t border-amber-400/10 pt-5 text-[11px] text-cream-60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p>&copy; {new Date().getFullYear()} The Watch Alley. All rights reserved.</p>
          <span className="hidden sm:inline text-amber-400/20">|</span>
          <a
            href="https://www.vibecoders.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 transition-colors hover:text-cream"
          >
            <span className="opacity-60 transition-opacity group-hover:opacity-100">Built by</span>
            <Image
              src="/brand/vibecodersph-logo-white.png"
              alt="Vibe Coders PH"
              width={95}
              height={40}
              className="h-10 w-auto object-contain opacity-60 transition-opacity group-hover:opacity-100 shrink-0"
            />
          </a>
        </div>
        <p className="uppercase tracking-[0.22em] opacity-80 sm:opacity-100">
          Black · Gold · Collector-first
        </p>
      </div>
    </footer>
  );
}
