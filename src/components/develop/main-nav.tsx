"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { BrandLogo } from "./brand-logo";

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
    lenis.scrollTo(target, { offset: -96, immediate: false });
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
      className="fixed top-2 left-0 right-0 z-50 px-3 md:top-4 md:px-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-amber-400/15 bg-[#090806]/75 px-4 py-2 shadow-[0_18px_58px_rgba(0,0,0,0.32)] backdrop-blur-xl md:px-5">
        {/* Logo — home */}
        <MotionLink
          href="/"
          aria-label="The Watch Alley home"
          onClick={handleHomeClick}
          className="group flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <BrandLogo
            className="h-9 w-[70px] md:h-10 md:w-[78px]"
            priority
            sizes="(max-width: 768px) 70px, 78px"
          />
        </MotionLink>

        {/* Nav */}
        <nav className="hidden items-center gap-9 lg:flex">
          {NAV_ITEMS.map((item) => {
            const href = resolveHref(pathname, item);
            return (
              <MotionLink
                key={item.label}
                href={href}
                onClick={item.anchor ? handleAnchorClick(item.anchor) : handleHomeClick}
                className="text-[12px] uppercase tracking-[0.2em] text-cream-60 transition-colors hover:text-cream"
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
          className="group inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-amber-300 transition-colors hover:border-amber-300/60 hover:bg-amber-300 hover:text-[#090806] md:px-4"
          whileHover={{ x: 3 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <span>Inquire</span>
          <svg
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
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
