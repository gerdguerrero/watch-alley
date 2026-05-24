"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MainNav() {
  const pathname = usePathname() || "";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const onHome = pathname === "/";

  // Navigation Links styling
  const linkClass = (active: boolean) =>
    `text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-mono transition-colors ${
      active ? "text-[color:var(--color-gold)] font-medium" : "text-cream-60 hover:text-cream"
    }`;

  return (
    <motion.header
      className="fixed top-2 left-0 right-0 z-50 px-3 md:top-4 md:px-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`mx-auto max-w-7xl items-center border border-amber-400/15 bg-[#090806]/85 px-6 shadow-[0_18px_58px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-500 ease-out md:px-8 grid grid-cols-3 ${
          isScrolled ? "rounded-2xl py-2.5 max-w-5xl" : "rounded-3xl py-4"
        }`}
      >
        {/* Left: Section Links */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/available" className={linkClass(pathname === "/available")}>
            Available
          </Link>
          <Link href="/sold" className={linkClass(pathname === "/sold")}>
            Sold
          </Link>
          <Link
            href={onHome ? "#heritage" : "/#heritage"}
            onClick={(e) => {
              if (onHome) {
                e.preventDefault();
                const heritage = document.getElementById("heritage");
                if (heritage) {
                  heritage.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }
            }}
            className={linkClass(false)}
          >
            Heritage
          </Link>
          <Link href="/journal" className={linkClass(pathname.startsWith("/journal"))}>
            Journal
          </Link>
        </div>

        {/* Center: Centered Logo + Wordmark */}
        <div className="flex items-center justify-center">
          <Link
            href="/"
            aria-label="The Watch Alley home"
            className="flex items-center gap-2 md:gap-3 group"
          >
            <Image
              src="/brand/logo-dp-flat-cropped.png"
              alt=""
              width={isScrolled ? 32 : 38}
              height={isScrolled ? 32 : 38}
              className="object-contain transition-all duration-500"
              priority
            />
            <span className="font-serif text-[12px] md:text-sm tracking-[0.12em] text-[color:var(--color-cream)] uppercase transition-all duration-500 hidden sm:inline">
              The Watch Alley
            </span>
          </Link>
        </div>

        {/* Right: Inquire & Locale */}
        <div className="flex items-center justify-end gap-5">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-gold)] hidden md:inline">
            EN · ₱ PHP
          </span>
          <Link
            href={onHome ? "#contact" : "/#contact"}
            onClick={(e) => {
              if (onHome) {
                e.preventDefault();
                const contact = document.getElementById("contact");
                if (contact) {
                  contact.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }
            }}
            className="group inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.18em] text-amber-300 transition-all duration-300 hover:border-amber-300/60 hover:bg-amber-300 hover:text-[#090806] md:px-5"
          >
            <span>Inquire</span>
            <svg
              className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5"
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
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
