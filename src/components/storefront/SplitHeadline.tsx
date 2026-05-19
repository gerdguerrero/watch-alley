"use client";

import { useEffect, useState } from "react";

interface SplitHeadlineProps {
  /**
   * Phrases, in order. Each phrase renders on its own line (no <br />
   * needed). Wrap any substring in `<em>...</em>` to emphasize it — those
   * spans receive the gold italic treatment.
   */
  phrases: string[];
  /** Tailwind classes applied to the wrapping <h1>. */
  className?: string;
  /** Total animation window in ms; characters spread evenly inside. */
  duration?: number;
  /** Initial delay before animation begins (ms). */
  initialDelay?: number;
}

/**
 * Editorial split-letter reveal for the hero headline. Each character mounts
 * invisible and floats up 0.4em on its own ease-out-quart curve, staggered
 * 18ms apart. Honors prefers-reduced-motion (shows fully visible at once).
 *
 * Renders the headline twice in the DOM: a visible animated layer and a
 * hidden static one that screen readers + crawlers index normally.
 * Markdown-lite: anything wrapped in `*...*` becomes gold italic emphasis.
 */
export function SplitHeadline({
  phrases,
  className = "",
  duration = 1400,
  initialDelay = 200,
}: SplitHeadlineProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setAnimate(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Tokenize: split on whitespace but keep `*...*` segments intact so emphasis spans don't break mid-word.
  function renderPhrase(phrase: string, lineIndex: number, charOffset: { value: number }) {
    const parts = phrase.split(/(\*[^*]+\*)/g).filter(Boolean);
    return parts.map((part, partIndex) => {
      const emphasized = part.startsWith("*") && part.endsWith("*");
      const text = emphasized ? part.slice(1, -1) : part;
      const chars = [...text];
      return (
        <span
          key={`${lineIndex}-${partIndex}`}
          className={emphasized ? "italic text-[color:var(--color-gold)]" : ""}
        >
          {chars.map((char, i) => {
            const globalIndex = charOffset.value++;
            const isSpace = char === " ";
            return (
              <span
                key={i}
                aria-hidden="true"
                className="inline-block whitespace-pre will-change-transform"
                style={{
                  opacity: animate ? 1 : 0,
                  transform: animate ? "translateY(0)" : "translateY(0.4em)",
                  transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${initialDelay + globalIndex * 18}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${initialDelay + globalIndex * 18}ms`,
                }}
              >
                {isSpace ? " " : char}
              </span>
            );
          })}
        </span>
      );
    });
  }

  const charOffset = { value: 0 };
  return (
    <h1 className={className}>
      {/* Visually-hidden static copy for assistive tech + crawlers. */}
      <span className="sr-only">{phrases.map((p) => p.replace(/\*/g, "")).join(" ")}</span>
      <span aria-hidden="true">
        {phrases.map((phrase, lineIndex) => (
          <span key={lineIndex} className="block">
            {renderPhrase(phrase, lineIndex, charOffset)}
          </span>
        ))}
      </span>
    </h1>
  );
}
