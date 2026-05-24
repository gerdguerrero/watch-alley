"use client";

import { motion } from "framer-motion";
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
      { label: "Authenticity", href: "/authenticity" },
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

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-amber-400/10 bg-[#080706] px-6 py-14 md:px-12 lg:px-20">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.06] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundOne})` }}
      />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.4fr_1fr_1fr] md:items-start">
        <div>
          <Link href="/" aria-label="The Watch Alley home" className="inline-flex">
            <BrandLogo className="h-24 w-24" sizes="96px" />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-cream-60">
            A Manila-based curator of pre-owned and brand-new watches — selected with taste,
            photographed honestly, and handled with care.
          </p>
          <a
            href="https://m.me/thewatchalley"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-3 rounded-full border border-amber-300/30 px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-300 hover:text-[#090806]"
          >
            Message the desk
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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

      <div className="relative z-10 mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-amber-400/10 pt-6 text-[11px] text-cream-60 md:flex-row md:items-center md:justify-between">
        <p>&copy; {new Date().getFullYear()} The Watch Alley. All rights reserved.</p>
        <p className="uppercase tracking-[0.22em]">Black · Gold · Collector-first</p>
      </div>
    </footer>
  );
}
