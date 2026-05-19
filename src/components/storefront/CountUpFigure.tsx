"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpFigureProps {
  target: number;
  suffix?: string;
  /** Animation duration in ms. */
  duration?: number;
  /** Render decimals up to this many places. */
  decimals?: number;
  /**
   * Delay before the count-up starts firing, in ms. Lets a row of stats
   * cascade (e.g. 250ms per item is the editorial sweet spot).
   */
  delay?: number;
  className?: string;
}

/**
 * Animates a number from 0 to `target` once, when the figure first enters
 * the viewport. Cubic ease-out. Frozen for motion-reduce users.
 *
 * The SSR render shows the final value so there's no layout flash and so
 * crawlers index the real figure. The animation only runs after hydration.
 */
export function CountUpFigure({
  target,
  suffix = "",
  duration = 2800,
  decimals = 0,
  delay = 0,
  className,
}: CountUpFigureProps) {
  const [value, setValue] = useState(target);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const el = ref.current;
    if (!el) return;

    // Honor reduced motion — keep final value, skip animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      started.current = true;
      return;
    }

    // Reset to 0 immediately on mount so the animation has somewhere to go.
    setValue(0);

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (started.current) return;
        started.current = true;
        io.disconnect();

        const begin = performance.now() + delay;
        const tick = (now: number) => {
          if (now < begin) {
            requestAnimationFrame(tick);
            return;
          }
          const t = Math.min((now - begin) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(target * eased);
          if (t < 1) requestAnimationFrame(tick);
          else setValue(target);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, delay]);

  const display =
    decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toString();

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
