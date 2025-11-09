"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig, useReducedMotion } from "framer-motion";

export default function Providers({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();

  return (
    // Smooth scrolling
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        smoothWheel: true,
      }}
    >
      {/* Global motion defaults + reduced-motion honor */}
      <MotionConfig
        transition={{ duration: 0.6, ease: "easeOut" }}
        reducedMotion={prefersReduced ? "always" : "never"}
      >
        {children}
      </MotionConfig>
    </ReactLenis>
  );
}
