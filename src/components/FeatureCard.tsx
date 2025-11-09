"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

type Effect = "beam" | "freeze" | "chart" | "none";

type Props = {
  icon: ReactNode;
  title: string;
  body: string;
  demo?: string;
  href?: string;
  effect?: Effect;
  className?: string;
};

export default function FeatureCardUltra({
  icon,
  title,
  body,
  demo,
  href,
  effect = "none",
  className = "",
}: Props) {
  const prefersReduced = useReducedMotion();
  const [frozen, setFrozen] = useState(false);
  const [glow, setGlow] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, s: 1 });
  const rafRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const Wrapper: any = href ? "a" : "div";

  const contentPad = effect === "chart" ? "pb-[90px] md:pb-[112px]" : "";

  const updateFromMouse = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget as HTMLDivElement;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;

    // cursor glow
    const nx = px * 100;
    const ny = py * 100;

    // subtle 3D tilt
    const ry = (px - 0.5) * 10; // rotateY
    const rx = (0.5 - py) * 10; // rotateX
    const s = 1.02;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setGlow({ x: nx, y: ny });
      setTilt({ rx, ry, s });
    });
  }, []);

  const resetTilt = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ rx: 0, ry: 0, s: 1 });
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const glowStyle = useMemo<CSSProperties>(
    () => ({
      left: `${glow.x}%`,
      top: `${glow.y}%`,
      transform: "translate(-50%,-50%)",
    }),
    [glow]
  );

  return (
    <motion.div
      ref={cardRef}
      whileHover={!prefersReduced ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative will-change-transform ${className}`}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      <Wrapper
        {...(href
          ? { href, "aria-label": title }
          : { role: "group", "aria-label": title })}
        onMouseMove={!prefersReduced ? updateFromMouse : undefined}
        onMouseLeave={!prefersReduced ? resetTilt : undefined}
        className="card card-hover p-6 md:p-8 relative block overflow-hidden z-0 rounded-2xl bg-white/[.04] border border-[var(--c-hairline)]"
        style={
          !prefersReduced
            ? {
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.s})`,
                transition: "transform 180ms ease",
              }
            : undefined
        }
      >
        {/* gradient ring (glassy hairline) */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{
            padding: "1px",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            background: "linear-gradient(90deg,#00D2FF,#00FFA6)",
            borderRadius: "inherit",
            opacity: 0.7,
          }}
        />

        {/* cursor-follow glow */}
        {!prefersReduced && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-[280px] w-[380px] rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
            style={{
              ...glowStyle,
              background:
                "radial-gradient(200px 140px at center, rgba(0,224,255,.20), rgba(0,224,255,0))",
            }}
          />
        )}

        {/* ===== CONTENT ===== */}
        <div className={`relative z-20 ${contentPad}`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-[var(--c-hairline)] flex items-center justify-center">
              {icon}
            </div>
            <div className="text-[18px] md:text-[20px] font-medium tracking-[-0.01em]">
              {title}
            </div>
          </div>

          <p className="mt-2 text-[var(--c-text-2)] text-[14px] md:text-[16px]">
            {body}
          </p>

          {demo ? (
            <code className="mt-3 inline-block text-[12px] text-[var(--c-text-muted)] bg-white/[.06] border border-[var(--c-hairline)] rounded-[10px] px-2 py-1 group-hover:bg-white/[.08] transition-colors">
              {demo}
            </code>
          ) : null}
        </div>

        {/* ===== EFFECTS ===== */}
        {effect === "beam" && <Beam />}
        {effect === "freeze" && (
          <>
            <FreezeToggle
              active={frozen}
              onToggle={() => setFrozen((v) => !v)}
            />
            <motion.div
              aria-hidden
              initial={false}
              animate={{ opacity: frozen ? 0.28 : 0 }}
              className="absolute inset-0 bg-white/30 backdrop-blur-[2px] pointer-events-none rounded-[inherit] z-10"
            />
          </>
        )}
        {effect === "chart" && <Bars />}
      </Wrapper>
    </motion.div>
  );
}

/* ---------- Beam (auto-respects reduced motion) ---------- */
function Beam() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <motion.span
      aria-hidden
      className="absolute left-[-10%] top-1/2 h-[2px] w-[120%] pointer-events-none z-10"
      style={{
        background:
          "linear-gradient(90deg, rgba(0,224,255,0), rgba(0,224,255,.9), rgba(0,224,255,0))",
        boxShadow: "0 0 20px rgba(0,224,255,.35)",
      }}
      initial={{ x: "-110%" }}
      animate={{ x: "10%" }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        repeatDelay: 2.4,
        ease: "easeInOut",
      }}
    />
  );
}

/* ---------- Freeze toggle ---------- */
function FreezeToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
      className="absolute right-4 bottom-4 inline-flex items-center gap-2 text-[12px] px-2 py-1 rounded-lg bg-white/10 border border-white/15 z-20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
    >
      <span
        className={`h-4 w-7 rounded-full relative transition-colors ${
          active ? "bg-emerald-400/80" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow ${
            active ? "right-1" : "left-1"
          } transition-all`}
        />
      </span>
      <span className="text-white/80">{active ? "Frozen" : "Freeze card"}</span>
    </button>
  );
}

/* ---------- Mini bars (insights) ---------- */
function Bars() {
  return (
    <div className="absolute inset-x-2 bottom-2 h-[72px] md:h-[96px] rounded-md border border-white/10 bg-white/[.04] overflow-hidden z-0 pointer-events-none">
      <div className="grid grid-cols-12 gap-1 h-full p-2 opacity-70">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="self-end rounded-sm bg-white/40"
            initial={{ height: 6, opacity: 0.7 }}
            whileInView={{
              height: 16 + (i % 5) * 12 + (i % 3) * 10,
              opacity: 1,
            }}
            viewport={{ once: true }}
            transition={{
              delay: i * 0.05,
              type: "spring",
              stiffness: 120,
              damping: 18,
            }}
          />
        ))}
      </div>
      <div className="absolute left-2 top-2 text-[11px] text-white/70">
        insights.open('spend')
      </div>
    </div>
  );
}