"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";

// Module-level memory gate. In Next.js client-side navigation (SPA),
// the Javascript environment persists in memory across route changes.
// This flag guarantees that the preloader component will NEVER trigger
// or re-evaluate state during SPA client routing.
let hasPlayedInSession = false;

export function EntrancePreloader() {
  const [showPreloader, setShowPreloader] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hingeGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Instant check of our in-memory SPA routing gate.
    // If the user is actively navigating within the client-side SPA lifecycle,
    // they should never experience the full-screen preloader overlay, regardless of timing.
    if (hasPlayedInSession) {
      return;
    }

    const force = new URLSearchParams(window.location.search).get("force-preload") === "true";

    // 2. Safe check of localStorage with a 5-minute (300,000 ms) cooldown
    let shouldPlay = true;
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    try {
      const lastRunStr = localStorage.getItem("twa-preloader-last-run");
      if (lastRunStr) {
        const lastRun = parseInt(lastRunStr, 10);
        const now = Date.now();
        if (now - lastRun < COOLDOWN_MS) {
          shouldPlay = false;
        }
      }
    } catch (e) {
      console.warn("Storage access blocked, falling back to in-memory safety:", e);
    }

    if (shouldPlay || force) {
      setShowPreloader(true);
      if (!force) {
        hasPlayedInSession = true;
        try {
          localStorage.setItem("twa-preloader-last-run", Date.now().toString());
        } catch (e) {
          console.warn("Writing to localStorage failed:", e);
        }
      }
      // Prevent scrolling while preloading is running
      document.body.style.overflow = "hidden";
    } else {
      hasPlayedInSession = true;
    }
  }, []);

  useGSAP(
    () => {
      if (!showPreloader) return;

      const hingeGlow = hingeGlowRef.current;

      // Hide the wordmarks initially using a clean translation offset
      gsap.set(["#preload-the", "#preload-watch-w", "#preload-watch-tch", "#preload-lley"], {
        opacity: 0,
        x: -18,
      });

      // Ensure the hands are fully visible from the start
      gsap.set(["#preload-left-leg", "#preload-right-leg"], {
        opacity: 1,
        scale: 1,
      });

      const tl = gsap.timeline({
        onComplete: () => {
          // Elegant fade-out of the entire preloader screen
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.8,
            ease: "power2.inOut",
            onComplete: () => {
              setShowPreloader(false);
              // Restore scrolling
              document.body.style.overflow = "";
            },
          });
        },
      });

      // 1. Minute Hand (Left Leg) rotates exactly once (360 degrees) around fixed hinge center (184.3, 35.4)
      tl.fromTo(
        "#preload-left-leg",
        { rotation: -360, svgOrigin: "184.3 35.4" },
        { rotation: 0, svgOrigin: "184.3 35.4", duration: 1.5, ease: "power3.inOut" },
        0.15
      );

      // 2. Hour Hand (Right Leg) rotates exactly 1 hour (30 degrees) around fixed hinge center (184.3, 35.4)
      tl.fromTo(
        "#preload-right-leg",
        { rotation: -30, svgOrigin: "184.3 35.4" },
        { rotation: 0, svgOrigin: "184.3 35.4", duration: 1.5, ease: "power3.inOut" },
        0.15
      );

      // 3. Trigger hinge connect snap glow
      tl.add(() => {
        if (hingeGlow) {
          gsap.fromTo(
            hingeGlow,
            { scale: 0.2, opacity: 0 },
            {
              scale: 1.8,
              opacity: 0.7,
              duration: 0.4,
              ease: "power2.out",
              onComplete: () => {
                gsap.to(hingeGlow, { opacity: 0, duration: 0.5, scale: 2.4, ease: "power2.in" });
              },
            }
          );
        }
      }, 1.4);

      // 4. Sequential slide and fade reveals following the hand movement
      tl.fromTo(
        "#preload-the",
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
        0.7
      );

      tl.fromTo(
        "#preload-watch-w",
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
        0.8
      );

      tl.fromTo(
        "#preload-watch-tch",
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
        1.1
      );

      tl.fromTo(
        "#preload-lley",
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
        1.2
      );

      // Add a 0.5-second standby pause at the end of the reveal before starting the fade-out
      tl.to({}, { duration: 0.5 });
    },
    { dependencies: [showPreloader], scope: containerRef }
  );

  if (!showPreloader) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#080706] pointer-events-auto select-none"
      style={{ willChange: "opacity" }}
    >
      <div className="relative w-full max-w-[450px] aspect-[490/365] p-6 flex items-center justify-center">
        {/* Subtle Hinge Glow Center Ring */}
        <div
          ref={hingeGlowRef}
          className="absolute rounded-full bg-[#BD9A32] blur-md pointer-events-none opacity-0 z-10 w-8 h-8"
          style={{ left: "37.6%", top: "9.7%", willChange: "transform, opacity" }}
        />

        {/* The Watch Alley Inline SVG Logo */}
        <svg
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 490 365"
          aria-hidden="true"
        >
          <g id="preload-logo">
            {/* THE wordmark */}
            <g id="preload-the" fill="#BD9A32" style={{ willChange: "transform, opacity" }}>
              <path d="M 11.839844 3.554688 L 2.25 3.554688 L 2.25 0 L 25.269531 0 L 25.269531 3.554688 L 15.679688 3.554688 L 15.679688 35.09375 L 11.839844 35.09375 Z M 11.839844 3.554688 " />
              <path d="M 62.890625 0 L 62.890625 35.09375 L 59.054688 35.09375 L 59.054688 18.15625 L 36.40625 18.15625 L 36.40625 35.09375 L 32.570312 35.09375 L 32.570312 0 L 36.40625 0 L 36.40625 14.597656 L 59.054688 14.597656 L 59.054688 0 Z M 62.890625 0 " />
              <path d="M 95.878906 31.535156 L 95.878906 35.09375 L 73.464844 35.09375 L 73.464844 0 L 95.316406 0 L 95.316406 3.554688 L 77.117188 3.554688 L 77.117188 14.550781 L 94.335938 14.550781 L 94.335938 18.058594 L 77.117188 18.058594 L 77.117188 31.535156 Z M 95.878906 31.535156 " />
            </g>

            {/* WATCH wordmark (minus A) */}
            <g id="preload-watch-w" fill="#FFFFFF" style={{ willChange: "transform, opacity" }}>
              <path d="M 126.226562 47.417969 L 101.164062 104.085938 L 77.527344 54.339844 L 72.957031 54.339844 L 49.589844 103.695312 L 24.65625 47.417969 L 0.242188 47.417969 L 46.972656 147.042969 L 49.980469 147.042969 L 75.183594 93.378906 L 100.375 147.042969 L 103.378906 147.042969 L 149.992188 47.417969 Z M 126.226562 47.417969 " />
            </g>
            <g id="preload-watch-tch" fill="#FFFFFF" style={{ willChange: "transform, opacity" }}>
              <path d="M 229.496094 47.417969 L 229.496094 67.269531 L 251.292969 67.269531 L 251.292969 117.15625 C 259.230469 121.398438 269.308594 136.628906 271.992188 145.34375 L 274.140625 145.34375 L 274.140625 67.269531 L 295.816406 67.269531 L 295.816406 47.417969 Z M 229.496094 47.417969 " />
              <path d="M 357.179688 67.007812 C 363.839844 67.007812 369.320312 68.175781 374.152344 70.664062 L 374.152344 49.375 C 369.320312 47.027344 362.011719 45.980469 355.871094 45.980469 C 326.363281 45.980469 304.296875 67.660156 304.296875 96.644531 C 304.296875 125.625 326.363281 147.300781 355.738281 147.300781 C 361.882812 147.300781 369.320312 146.382812 374.152344 143.777344 L 374.152344 122.757812 C 369.320312 125.105469 363.839844 126.152344 357.179688 126.152344 C 339.941406 126.152344 327.152344 114.011719 327.152344 96.644531 C 327.152344 79.140625 339.941406 67.007812 357.179688 67.007812 " />
              <path d="M 463.453125 47.417969 L 463.453125 83.84375 L 419.445312 83.84375 L 419.445312 47.417969 L 396.601562 47.417969 L 396.601562 145.34375 L 419.445312 145.34375 L 419.445312 104.605469 L 463.453125 104.605469 L 463.453125 145.34375 L 486.296875 145.34375 L 486.296875 47.417969 Z M 463.453125 47.417969 " />
            </g>

            {/* Caliper / Compass A Graphic */}
            <g id="preload-compass" fill="#BD9A32">
              <path
                id="preload-left-leg"
                style={{ willChange: "transform" }}
                d="M 191.316406 46.957031 C 184.949219 50.867188 176.585938 48.863281 172.675781 42.492188 C 168.765625 36.125 170.769531 27.761719 177.140625 23.851562 C 183.511719 19.941406 191.871094 21.945312 195.78125 28.316406 C 199.679688 34.683594 197.6875 43.046875 191.316406 46.957031 M 156.742188 177.445312 C 151.984375 177.457031 141.273438 176.902344 134.214844 172.058594 L 165.371094 70.074219 C 171.273438 68.796875 178.320312 72.902344 181.285156 74.882812 Z M 128.140625 296.972656 C 123.113281 299.347656 113.878906 305.222656 105.722656 318.625 C 105.761719 308.199219 104.003906 297.378906 98.742188 288.179688 L 130.957031 182.753906 C 135.433594 183.738281 149.511719 186.960938 153.839844 189.554688 Z M 208.542969 20.472656 C 200.304688 7.042969 182.722656 2.839844 169.296875 11.078125 C 155.867188 19.328125 151.664062 36.898438 159.902344 50.339844 C 160.957031 52.046875 162.164062 53.621094 163.492188 55.023438 L 91.992188 289.066406 C 92.261719 289.472656 92.53125 289.878906 92.777344 290.296875 C 108.332031 315.625 92.136719 357.800781 92.136719 357.800781 L 98.152344 359.941406 C 106.265625 308.691406 133.429688 301.523438 133.429688 301.523438 L 190.433594 63.261719 C 193.433594 62.597656 196.382812 61.429688 199.164062 59.71875 C 212.589844 51.484375 216.796875 33.910156 208.542969 20.472656 "
              />
              <path
                id="preload-right-leg"
                style={{ willChange: "transform" }}
                d="M 244.535156 160.117188 C 236.46875 150.699219 233.835938 139.386719 236.691406 126.4375 C 241.289062 128.125 250.535156 132.625 255.578125 142.84375 C 259.328125 150.429688 260.066406 159.785156 257.8125 170.742188 C 255.058594 169.253906 249.402344 165.808594 244.535156 160.117188 M 254.925781 181.179688 C 253.472656 184.105469 253.152344 188.054688 253.992188 193.28125 C 250.167969 188.730469 245.371094 184.378906 239.566406 181.402344 C 241.191406 174.847656 241.460938 168.996094 240.832031 163.820312 C 247.019531 170.914062 254.078125 174.75 256.546875 175.957031 C 256.070312 177.664062 255.539062 179.410156 254.925781 181.179688 M 234.734375 179.152344 C 224.566406 174.039062 217.976562 167.101562 215.109375 158.542969 C 211.730469 148.398438 214.507812 138.527344 215.714844 135.550781 C 218.738281 137.371094 223.015625 140.417969 226.851562 144.847656 C 235.117188 154.375 237.773438 165.910156 234.734375 179.152344 M 205.101562 104.257812 L 219.648438 97.285156 L 230.921875 122.761719 L 231.746094 124.691406 C 230.320312 130.851562 230.097656 136.386719 230.6875 141.292969 L 230.652344 141.253906 C 225.328125 135.179688 219.363281 131.492188 216.15625 129.796875 Z M 190.148438 69.71875 L 204.621094 63.285156 L 217.542969 92.503906 L 203.023438 99.460938 Z M 178.75 52.21875 C 169.503906 49.132812 164.476562 39.113281 167.550781 29.851562 C 170.625 20.59375 180.65625 15.566406 189.917969 18.640625 C 199.164062 21.714844 204.203125 31.746094 201.117188 41.003906 C 198.042969 50.265625 188.011719 55.292969 178.75 52.21875 M 259.734375 183.257812 C 275.71875 137.0625 245.199219 123.746094 237.425781 121.164062 C 236.332031 120.808594 235.695312 120.648438 235.695312 120.648438 L 205.816406 53.066406 C 207.941406 50.484375 209.652344 47.472656 210.769531 44.09375 C 215.625 29.484375 207.722656 13.707031 193.101562 8.851562 C 178.492188 3.996094 162.71875 11.902344 157.859375 26.519531 C 153.003906 41.128906 160.910156 56.90625 175.53125 61.761719 C 177.535156 62.425781 179.5625 62.855469 181.566406 63.050781 L 211.519531 132.230469 C 209.824219 135.023438 197.734375 167.753906 234.355469 184.769531 C 252.488281 191.878906 261.035156 215.402344 261.035156 215.402344 L 265.734375 213.1875 C 265.734375 213.1875 255.636719 190.527344 259.734375 183.257812 "
              />
            </g>

            {/* LLEY wordmark */}
            <g id="preload-lley" fill="#BD9A32" style={{ willChange: "transform, opacity" }}>
              <path d="M 318.738281 216.417969 L 318.738281 222.9375 L 286.738281 222.9375 L 286.738281 158.59375 L 293.773438 158.59375 L 293.773438 216.417969 Z M 318.738281 216.417969 " />
              <path d="M 365.328125 216.417969 L 365.328125 222.9375 L 333.328125 222.9375 L 333.328125 158.59375 L 340.363281 158.59375 L 340.363281 216.417969 Z M 365.328125 216.417969 " />
              <path d="M 421.007812 216.417969 L 421.007812 222.9375 L 379.914062 222.9375 L 379.914062 158.59375 L 419.976562 158.59375 L 419.976562 165.113281 L 386.605469 165.113281 L 386.605469 185.273438 L 418.175781 185.273438 L 418.175781 191.707031 L 386.605469 191.707031 L 386.605469 216.417969 Z M 421.007812 216.417969 " />
              <path d="M 461.417969 203.804688 L 461.417969 222.9375 L 454.296875 222.9375 L 454.296875 203.804688 L 429.503906 158.59375 L 437.226562 158.59375 L 457.902344 196.683594 L 478.664062 158.59375 L 486.296875 158.59375 Z M 461.417969 203.804688 " />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
