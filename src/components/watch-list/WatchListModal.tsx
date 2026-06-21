"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WatchListSignupForm } from "./WatchListSignupForm";

export function WatchListModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Prevent rendering or triggering on the server-side
    if (typeof window === "undefined") return;

    // Check if user has already dismissed or subscribed
    const dismissed = localStorage.getItem("twa-watchlist-dismissed") === "true";
    const subscribed = localStorage.getItem("twa-watchlist-subscribed") === "true";

    if (dismissed || subscribed) {
      return;
    }

    let timerId: NodeJS.Timeout;

    const triggerModal = () => {
      setIsOpen(true);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };

    // Trigger after 8 seconds of page viewing
    timerId = setTimeout(triggerModal, 8000);

    // Trigger on exit-intent (mouse leaves top of screen)
    const handleMouseLeave = (event: MouseEvent) => {
      if (event.clientY < 50) {
        clearTimeout(timerId);
        triggerModal();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    // Close on Escape key press
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("twa-watchlist-dismissed", "true");
  };

  const handleSuccess = () => {
    localStorage.setItem("twa-watchlist-subscribed", "true");
    // Auto-close modal after a 2.5 second delay so they can read the confirmation message
    setTimeout(() => {
      setIsOpen(false);
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="watchlist-modal-title"
            className="relative w-full max-w-md bg-[#0d0c0a] border border-amber-300/15 rounded-2xl p-6 md:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col gap-5 z-10"
          >
            {/* Ambient gold glow background */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-300/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-amber-300/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-cream-60/80 hover:text-amber-300 transition-colors p-1 rounded-full hover:bg-white/5 cursor-pointer"
              aria-label="Close modal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="flex flex-col gap-2 relative z-10">
              <h2
                id="watchlist-modal-title"
                className="font-serif italic text-2xl md:text-3xl text-amber-200"
              >
                Join The Watch List
              </h2>
              <p className="text-xs leading-relaxed text-cream-60/90">
                First access to curated drops, rare finds, collector notes, and sourcing
                opportunities from Manila.
              </p>
            </div>

            {/* Signup Form */}
            <div className="relative z-10">
              <WatchListSignupForm
                source="watchlist-popup-modal"
                showPreferences={false}
                compact={false}
                onSuccess={handleSuccess}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
