"use client";

import { useEffect } from "react";

interface CarouselDragMountProps {
  targetId: string;
}

/**
 * Renderless client island that wires mouse-drag-to-scroll on the arrivals
 * carousel. Touch already works via native overflow-x-auto + scroll-snap;
 * this fills the desktop gap.
 *
 * Suppresses the synthetic click that would otherwise fire when the user
 * releases after a drag, so a drag-then-release on a card doesn't open it.
 */
export function CarouselDragMount({ targetId }: CarouselDragMountProps) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let dragDistance = 0;

    function onMouseDown(event: MouseEvent) {
      if (!el) return;
      // Only react to primary button.
      if (event.button !== 0) return;
      isDown = true;
      startX = event.pageX - el.offsetLeft;
      startScrollLeft = el.scrollLeft;
      dragDistance = 0;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    }
    function onMouseLeave() {
      if (!el) return;
      isDown = false;
      el.style.cursor = "grab";
      el.style.removeProperty("user-select");
    }
    function onMouseUp() {
      if (!el) return;
      isDown = false;
      el.style.cursor = "grab";
      el.style.removeProperty("user-select");
    }
    function onMouseMove(event: MouseEvent) {
      if (!isDown || !el) return;
      event.preventDefault();
      const x = event.pageX - el.offsetLeft;
      const walk = x - startX;
      dragDistance = Math.abs(walk);
      el.scrollLeft = startScrollLeft - walk;
    }
    function onClickCapture(event: MouseEvent) {
      // Suppress the click that fires after a drag-release (>4px). Real
      // clicks on cards still go through.
      if (dragDistance > 4) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    el.style.cursor = "grab";
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("click", onClickCapture, { capture: true });

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("click", onClickCapture, { capture: true });
      el.style.removeProperty("cursor");
      el.style.removeProperty("user-select");
    };
  }, [targetId]);

  return null;
}
