"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  /** IntersectionObserver threshold. Default 0.2 = 20% in view. */
  threshold?: number;
  /** Optional className passthrough on the wrapper div. */
  className?: string;
}

/**
 * Renderless-ish client island. Wraps content and toggles the
 * `data-wa-reveal` attribute on its wrapper when the wrapper first
 * enters the viewport. Children opt into the animation by adding the
 * `.wa-rev-rule` (scaleX rule draw) or `.wa-rev-rise` (fade + 12px rise)
 * classes - both defined in globals.css and scoped to
 * `[data-wa-reveal="true"]`.
 *
 * Honors prefers-reduced-motion (reveals immediately, no animation).
 *
 * Reusable: drop one wrapper around any section that wants its content
 * to fade in on scroll. No global state, no orchestrator.
 */
export function ScrollReveal({ children, threshold = 0.2, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} data-wa-reveal={revealed ? "true" : "false"} className={className}>
      {children}
    </div>
  );
}
