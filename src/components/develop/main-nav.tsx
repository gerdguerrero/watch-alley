"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

const MotionLink = motion.create(Link);

interface NavItem {
  label: string;
  /** In-page anchor id (without #). The nav routes Home → top, others → #id. */
  anchor?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home" },
  { label: "Collection", anchor: "collection" },
  { label: "Journal", anchor: "journal" },
  { label: "Heritage", anchor: "heritage" },
  { label: "Contact", anchor: "contact" },
];

function resolveHref(pathname: string | null, item: NavItem): string {
  const onHome = pathname === "/";
  if (!item.anchor) return "/";
  return onHome ? `#${item.anchor}` : `/#${item.anchor}`;
}

function smoothScroll(anchor: string) {
  if (typeof window === "undefined") return;
  const target = document.getElementById(anchor);
  if (!target) return;
  const lenis = window.__waLenis;
  if (lenis) {
    lenis.scrollTo(target, { offset: -80, immediate: false });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function MainNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  // Inquire pin: scroll to #contact on the homepage; otherwise punch back to /#contact.
  const inquireHref = onHome ? "#contact" : "/#contact";
  const handleAnchorClick = (anchor: string | undefined) => (e: MouseEvent) => {
    if (!onHome || !anchor) return;
    e.preventDefault();
    smoothScroll(anchor);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${anchor}`);
    }
  };

  const handleHomeClick = (e: MouseEvent) => {
    if (!onHome) return;
    e.preventDefault();
    const lenis = window.__waLenis;
    if (lenis) {
      lenis.scrollTo(0, { immediate: false });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.history.replaceState(null, "", "/");
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 mix-blend-difference"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-6">
        {/* Logo — home */}
        <MotionLink
          href="/"
          onClick={handleHomeClick}
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <span className="text-sm font-medium tracking-[0.2em] text-zinc-100">
            WATCH ALLEY
          </span>
        </MotionLink>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-12">
          {NAV_ITEMS.map((item) => {
            const href = resolveHref(pathname, item);
            return (
              <MotionLink
                key={item.label}
                href={href}
                onClick={
                  item.anchor
                    ? handleAnchorClick(item.anchor)
                    : handleHomeClick
                }
                className="text-[13px] text-zinc-500 hover:text-zinc-100 transition-colors"
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {item.label}
              </MotionLink>
            );
          })}
        </nav>

        {/* Inquire CTA */}
        <motion.a
          href={inquireHref}
          onClick={handleAnchorClick("contact")}
          className="text-[13px] text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2 group"
          whileHover={{ x: 3 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <span className="border-b border-amber-500/50 group-hover:border-amber-400 pb-px">
            Inquire
          </span>
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M1 11L11 1M11 1H3M11 1V9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.a>
      </div>
    </motion.header>
  );
}
