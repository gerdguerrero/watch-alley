"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const MotionLink = motion.create(Link);

const FOOTER_LINKS = [
  { label: "Available", href: "/available" },
  { label: "Sold", href: "/sold" },
  { label: "Journal", href: "/journal" },
  { label: "Authenticity", href: "/authenticity" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="relative bg-[#0a0a0a] border-t border-zinc-900/50 px-6 md:px-12 lg:px-20 py-12">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-sm font-medium tracking-[0.2em] text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          WATCH ALLEY
        </Link>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-8">
          {FOOTER_LINKS.map((link) => (
            <MotionLink
              key={link.label}
              href={link.href}
              className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {link.label}
            </MotionLink>
          ))}
        </nav>

        {/* Copyright */}
        <p className="text-[11px] text-zinc-700 tracking-wide">
          &copy; {new Date().getFullYear()} The Watch Alley. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
