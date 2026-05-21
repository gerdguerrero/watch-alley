"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __waLenis?: Lenis;
  }
}

interface SmoothScrollProviderProps {
  children: ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    window.__waLenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // If we landed on a URL with a #hash, smooth-scroll to it after mount.
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (target) lenis.scrollTo(target, { offset: -80, immediate: false });
      });
    }

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete window.__waLenis;
    };
  }, []);

  return <>{children}</>;
}
