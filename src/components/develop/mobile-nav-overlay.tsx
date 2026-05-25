"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { type MouseEvent, useEffect, useRef } from "react";

export interface MobileNavLink {
  label: string;
  href: string;
  onClick?: (e: MouseEvent) => void;
}

interface MobileNavDropdownProps {
  open: boolean;
  onClose: () => void;
  links: MobileNavLink[];
  inquireHref: string;
}

/**
 * Compact dropdown panel anchored under the navbar on phone. Opens when the
 * hamburger trigger is tapped. Closes on ESC, on outside click, and after the
 * user picks a destination link.
 */
export function MobileNavOverlay({ open, onClose, links, inquireHref }: MobileNavDropdownProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    // Use pointerdown so it fires before the next nav-trigger click; also use
    // capture so we see clicks before any inner stopPropagation handlers.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          className="absolute right-0 top-full z-[60] mt-3 w-56 origin-top-right overflow-hidden rounded-2xl border border-amber-400/15 bg-[#090806]/95 shadow-[0_18px_58px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:hidden"
          role="menu"
          aria-label="Mobile navigation"
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <nav className="flex flex-col py-2">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  link.onClick?.(e);
                  onClose();
                }}
                role="menuitem"
                className="px-5 py-3 text-[11px] uppercase tracking-[0.2em] font-mono text-cream-60 transition-colors hover:bg-amber-400/10 hover:text-cream"
              >
                {link.label}
              </Link>
            ))}
            <div className="mx-5 my-2 h-px bg-amber-400/15" />
            <a
              href={inquireHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              role="menuitem"
              className="mx-3 mb-2 inline-flex items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300"
            >
              Inquire
            </a>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
