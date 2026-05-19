"use client";

import { useEffect } from "react";

/**
 * Renderless client island. Toggles `data-scrolled` on #main-nav so the nav
 * CSS can shrink padding + logo when the user scrolls past 60px. Animation
 * uses cubic ease-out (0.22, 1, 0.36, 1) on transform — no layout thrash.
 */
export function NavScrollMount() {
  useEffect(() => {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    let raf = 0;
    function update() {
      raf = 0;
      if (!nav) return;
      const scrolled = window.scrollY > 60;
      nav.setAttribute("data-scrolled", scrolled ? "true" : "false");
    }
    function onScroll() {
      if (raf !== 0) return;
      raf = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf !== 0) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
