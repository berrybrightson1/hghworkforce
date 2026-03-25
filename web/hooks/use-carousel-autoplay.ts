"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

function subscribeMobileCarousel(cb: () => void) {
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getMobileCarousel(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Advances a horizontal snap carousel every `intervalMs` (default 3s).
 * Only runs below Tailwind `md` (carousel visible). Pauses on hover and when the tab is hidden.
 * Respects prefers-reduced-motion (no autoplay).
 */
export function useCarouselAutoplay(
  scrollerRef: RefObject<HTMLDivElement | null>,
  slideCount: number,
  intervalMs = 3000,
) {
  const [hoverPaused, setHoverPaused] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobileCarousel, getMobileCarousel, () => false);

  useEffect(() => {
    if (!isMobile || slideCount <= 1) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || hoverPaused) return;

    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const w = el.clientWidth;
      const current = Math.min(Math.max(Math.round(el.scrollLeft / w), 0), slideCount - 1);
      const next = (current + 1) % slideCount;
      el.scrollTo({ left: next * w, behavior: "smooth" });
    }, intervalMs);

    return () => clearInterval(id);
  }, [isMobile, scrollerRef, slideCount, intervalMs, hoverPaused]);

  const pauseProps = {
    onMouseEnter: () => setHoverPaused(true),
    onMouseLeave: () => setHoverPaused(false),
  } as const;

  return { pauseProps };
}
