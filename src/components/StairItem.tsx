// StairItem.tsx
"use client";
import type { ReactNode } from "react";

export default function StairItem({
  step,             // 0, 1, 2...
  children,
  className = "",
}: { step: 0 | 1 | 2; children: ReactNode; className?: string }) {
  // mobile-only offsets → ladder; reset at md
  const offsets =
    step === 0
      ? "ml-0 translate-y-0"
      : step === 1
      ? "ml-3 -mt-6"
      : "ml-6 -mt-6";

  return (
    <div
      className={[
        // mobile ladder
        "relative", offsets,
        // reset at md+
        "md:ml-0 md:mt-0 md:translate-y-0",
        // gentle layering so steps overlap nicely
        step === 0 ? "z-30" : step === 1 ? "z-20" : "z-10",
        className,
      ].join(" ")}
    >
      {/* optional left rail on mobile */}
      <span className="md:hidden pointer-events-none absolute left-0 top-2 bottom-4 w-px bg-white/10" />
      {children}
    </div>
  );
}
