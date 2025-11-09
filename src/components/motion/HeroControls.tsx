"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export default function HeroControls({
  count,
  index,
  onPrev,
  onNext,
  onDot,
}: {
  count: number;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onDot: (i: number) => void;
}) {
  const dots = useMemo(() => Array.from({ length: Math.max(0, count) }), [count]);
  const disabled = count < 2;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex items-center justify-between px-4 md:px-6"
      aria-hidden={disabled}
    >
      {/* Prev */}
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled}
        className="pointer-events-auto rounded-full border border-white/20 bg-black/30 px-3 py-2 backdrop-blur-sm hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        aria-label="Previous slide"
      >
        ‹
      </button>

      {/* Dots */}
      <div
        className="pointer-events-auto flex items-center gap-2"
        role="tablist"
        aria-label="Slide selector"
      >
        {dots.map((_, i) => {
          const active = i === index;
          return (
            <motion.button
              key={i}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => onDot(i)}
              className={`h-2.5 w-2.5 rounded-full outline-none ring-offset-0 ${
                active ? "bg-white/90" : "bg-white/30"
              } focus-visible:ring-2 focus-visible:ring-cyan-400/60`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              animate={active ? { scale: 1.15 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            />
          );
        })}
      </div>

      {/* Next */}
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="pointer-events-auto rounded-full border border-white/20 bg-black/30 px-3 py-2 backdrop-blur-sm hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        aria-label="Next slide"
      >
        ›
      </button>
    </div>
  );
}
