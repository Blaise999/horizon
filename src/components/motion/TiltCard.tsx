"use client";

import {
  useRef,
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

/**
 * TiltCard
 * - Proper perspective wrapper
 * - Mouse-follow glare
 * - Gracefully disables on touch / reduced-motion
 */
type TiltCardProps = ComponentPropsWithoutRef<"div"> & {
  className?: string;
  intensity?: number;     // tilt strength (deg)
  glare?: boolean;        // add light streak
  maxGlow?: number;       // glare opacity 0..1
};

export default function TiltCard({
  children,
  className = "",
  intensity = 10,
  glare = true,
  maxGlow = 0.22,
  ...props
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(true);

  // disable on touch / reduced motion
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduce) setEnabled(false);
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ry = (x / rect.width - 0.5) * intensity * 2; // yaw
      const rx = (y / rect.height - 0.5) * -intensity * 2; // pitch

      el.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg) translateZ(0)`;

      if (glare) {
        const g = el.querySelector<HTMLElement>(".tilt-glare");
        if (g) {
          const gx = (x / rect.width) * 100;
          const gy = (y / rect.height) * 100;
          g.style.opacity = String(maxGlow);
          g.style.background = `radial-gradient(180px 120px at ${gx}% ${gy}%, rgba(255,255,255,.25), rgba(255,255,255,0))`;
        }
      }
    },
    [enabled, intensity, glare, maxGlow]
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "rotateY(0deg) rotateX(0deg) translateZ(0)";
    const g = el.querySelector<HTMLElement>(".tilt-glare");
    if (g) g.style.opacity = "0";
  }, []);

  return (
    <div
      className="relative"
      style={{ perspective: 900 }} // parent perspective
    >
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={`relative rounded-2xl border border-[var(--c-hairline)] bg-[#101826] will-change-transform transition-transform duration-200 ${className}`}
        style={{ transformStyle: "preserve-3d" }}
        {...props}
      >
        {/* glare layer */}
        {glare && (
          <span
            aria-hidden
            className="tilt-glare pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200"
            style={{ mixBlendMode: "screen" }}
          />
        )}

        {children}
      </div>
    </div>
  );
}
