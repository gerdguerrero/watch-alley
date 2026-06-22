"use client";

import { motion, useInView } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { BRAND_ASSETS } from "@/lib/brand/assets";
import { BrandLogo } from "./brand-logo";

const WatchDisplay = dynamic(() => import("./watch-display").then((mod) => mod.WatchDisplay), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-300/25 border-t-amber-300" />
    </div>
  ),
});

const MESSENGER_URL = "https://m.me/thewatchalley";
const MotionLink = motion.create(Link);

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#080706] pt-24 pb-16 md:pt-32 md:pb-20"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-luminosity"
        style={{ backgroundImage: `url(${BRAND_ASSETS.backgroundTwo})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.14)_0%,rgba(180,120,60,0.04)_42%,transparent_72%)]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />

      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <motion.div
          className="mx-auto max-w-6xl rounded-[2rem] border border-amber-400/15 bg-black/25 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-md md:p-10 lg:p-14"
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Mobile-only standalone logo so the order on phone reads:
                logo -> watch -> text. On desktop the logo lives inside the
                text column on the right. */}
            <motion.div
              className="order-1 flex justify-center lg:hidden"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              <BrandLogo className="h-24 w-24" sizes="96px" />
            </motion.div>

            <motion.div
              className="relative order-2 lg:order-1"
              initial={{ opacity: 0, x: -40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.25, duration: 0.8 }}
            >
              <div className="relative mx-auto aspect-square max-w-md">
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-60"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(245, 158, 11, 0.36) 0%, transparent 62%)",
                  }}
                />
                <div className="absolute inset-8 rounded-full border border-amber-300/10" />
                <div className="relative z-10 h-full w-full">
                  <WatchDisplay />
                </div>
              </div>
            </motion.div>

            <div className="order-3 text-center lg:order-2 lg:text-left">
              {/* Desktop-only logo inside text column. Mobile logo above the
                  watch is rendered as a separate grid item. */}
              <motion.div
                className="mb-8 hidden justify-start lg:flex"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.15, duration: 0.6 }}
              >
                <BrandLogo className="h-24 w-24" sizes="96px" />
              </motion.div>

              <motion.p
                className="mb-6 text-[11px] uppercase tracking-[0.3em] text-amber-300 font-mono"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Private Collecting Desk
              </motion.p>
              <h2 className="mb-6 font-serif text-4xl leading-[1.08] text-cream md:text-5xl lg:text-6xl">
                <span className="italic">Ready for</span>
                <br />
                <span className="font-light text-cream-60">your next piece?</span>
              </h2>
              <p className="mx-auto mb-8 max-w-md text-[15px] leading-relaxed text-cream-60 lg:mx-0">
                Tell us what you are looking for: reference, budget, wrist size, occasion, or
                simply the feeling you want from the watch. We will guide you toward the right fit.
              </p>

              <motion.div
                className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:items-start lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.45, duration: 0.6 }}
              >
                <motion.a
                  href={MESSENGER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 rounded-full bg-amber-300 px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#090806]"
                  whileHover={{ scale: 1.02, backgroundColor: "rgb(251, 191, 36)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <span>Message on Messenger</span>
                  <svg
                    className="h-3 w-3 transition-transform group-hover:translate-x-1"
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
                <MotionLink
                  href="/available"
                  className="inline-flex items-center rounded-full border border-cream/15 px-8 py-4 text-[12px] uppercase tracking-[0.16em] text-cream transition-all duration-300 hover:border-amber-300/50 hover:text-amber-200"
                  whileTap={{ scale: 0.98 }}
                >
                  View Collection
                </MotionLink>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
