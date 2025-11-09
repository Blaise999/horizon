"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Plus, ArrowRightLeft } from "lucide-react";

/** Mini FX drift ticker (±0.04% clamp) */
function FxTicker() {
  const [v, setV] = useState(0.01);
  useEffect(() => {
    const id = setInterval(() => {
      setV((p) => {
        const next = p + (Math.random() - 0.5) * 0.01;
        return Math.max(-0.04, Math.min(0.04, +next.toFixed(2)));
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);
  const up = v >= 0;
  return (
    <div className="hidden sm:flex items-center gap-2 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${
          up ? "bg-emerald-400" : "bg-rose-400"
        } animate-pulse`}
        aria-hidden
      />
      <span className="text-white/60">Mid-market drift</span>
      <span className={`num ${up ? "text-emerald-400" : "text-rose-400"}`}>
        {up ? "+" : ""}
        {v.toFixed(2)}%
      </span>
    </div>
  );
}

type Confetti = { id: number; x: number; y: number; r: number; tx: number; rot: number };

export default function BalanceCard() {
  const [show, setShow] = useState(true);
  const [bal, setBal] = useState(0);
  const target = 28320.44;

  // ease-in count up
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const step = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setBal(target * (0.5 - Math.cos(Math.PI * p) / 2)); // cosine ease
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // tiny sparkline behind the amount
  const points = useMemo(() => {
    const vals = [28.1, 27.6, 28.0, 27.2, 27.8, 28.6, 28.3, 28.7, 28.5, 28.9];
    const w = 160,
      h = 40;
    const min = Math.min(...vals),
      max = Math.max(...vals);
    const norm = (v: number) =>
      (1 - (v - min) / (max - min + 0.0001)) * (h - 6) + 3;
    return vals
      .map((v, i) => `${(i / (vals.length - 1)) * (w - 6) + 3},${norm(v)}`)
      .join(" ");
  }, []);

  const amount = show
    ? `$${bal.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "•••••••";

  /** Interactive spotlight */
  const wrapRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSpot({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  /** Confetti on “Add money” + smooth top-up */
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const nextId = useRef(0);
  const addMoney = () => {
    // sprinkle 14 pieces from button area
    const baseY = 70 + Math.random() * 10;
    const batch: Confetti[] = Array.from({ length: 14 }).map(() => ({
      id: nextId.current++,
      x: 78 + Math.random() * 16,
      y: baseY + Math.random() * 6,
      r: 2 + Math.random() * 3,
      tx: -40 + Math.random() * 80,
      rot: Math.random() * 360,
    }));
    setConfetti((c) => [...c, ...batch]);
    setTimeout(() => {
      setConfetti((c) => c.slice(batch.length));
    }, 1200);

    // animate +$50
    const start = bal;
    const end = bal + 50;
    const dur = 700;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 0.5 - Math.cos(Math.PI * p) / 2;
      setBal(start + (end - start) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return (
    <motion.div
      ref={wrapRef}
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-[var(--c-hairline)] bg-[linear-gradient(180deg,#111926,#0E131B)] p-6 md:p-8 glow-ring"
      style={
        {
          "--spot-x": `${spot.x}%`,
          "--spot-y": `${spot.y}%`,
        } as React.CSSProperties
      }
    >
      {/* animated gradient ring */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          padding: 2,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          background:
            "linear-gradient(90deg,#00D2FF,#00FFA6,#00D2FF) 0/200% 100%",
          animation: "ringShift 10s linear infinite",
          opacity: 0.55,
        }}
      />
      {/* spotlight that follows cursor */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-24 rounded-[inherit] opacity-0 md:opacity-100"
        style={{
          background:
            "radial-gradient(240px 140px at var(--spot-x) var(--spot-y), rgba(0,224,255,.12), rgba(0,224,255,0))",
          mixBlendMode: "screen",
        }}
      />

      {/* content */}
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs text-[var(--c-text-muted)] uppercase tracking-[.1em]">
            Checking •••• 8421
          </div>
          <FxTicker />
        </div>

        {/* amount + sparkline */}
        <div className="mt-2 relative flex items-end gap-3">
          <div className="balance-lead text-[26px] md:text-[40px] font-semibold num shimmer">
            {amount}
          </div>
          {/* sparkline */}
          <svg
            className="hidden md:block absolute -bottom-2 left-[calc(100%+12px)]"
            width="160"
            height="40"
            viewBox="0 0 160 40"
            aria-hidden
          >
            <defs>
              <linearGradient id="fill-cyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0,224,255,.18)" />
                <stop offset="100%" stopColor="rgba(0,224,255,0)" />
              </linearGradient>
            </defs>
            <polyline
              points={points}
              fill="none"
              stroke="rgba(0,224,255,.55)"
              strokeWidth="2"
            />
            <polyline points={`0,40 ${points} 160,40`} fill="url(#fill-cyan)" />
          </svg>
        </div>

        <button
          onClick={() => setShow((s) => !s)}
          className="mt-1 text-sm text-[var(--c-text-2)] hover:text-white inline-flex items-center gap-1"
          aria-pressed={show}
          aria-label="Toggle balance visibility"
        >
          {show ? <Eye size={16} /> : <EyeOff size={16} />}{" "}
          {show ? "Hide" : "Show"} balance
        </button>

        {/* Quick actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={addMoney}
            className="relative px-3 py-2 rounded-[var(--r-chip)] bg-[linear-gradient(180deg,#00D4FF,#00B4D8)] text-[#0B0F14] font-medium border border-white/10 hover:brightness-[1.05] active:brightness-95 transition"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={16} /> Add money
            </span>
          </button>
          <button className="px-3 py-2 rounded-[var(--r-chip)] bg-white/10 hover:bg-white/15 border border-[var(--c-hairline)]">
            <span className="inline-flex items-center gap-2">
              <ArrowRightLeft size={16} /> Transfer
            </span>
          </button>
        </div>

        {/* Transactions mini-list (stagger in) */}
        <motion.div
          className="mt-5 space-y-2 text-sm"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.08, delayChildren: 0.05 },
            },
          }}
        >
          {[
            { n: "Grocery", v: -45.0 },
            { n: "Salary", v: 2400.0 },
            { n: "Coffee", v: -4.5 },
          ].map((t) => (
            <motion.div
              key={t.n}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
              }}
              className="flex items-center justify-between"
            >
              <span className="text-[var(--c-text-2)]">{t.n}</span>
              <span
                className={`num ${
                  t.v >= 0 ? "text-[var(--c-success)]" : "text-[var(--c-danger)]"
                }`}
              >
                {t.v >= 0 ? "+" : "−"}${Math.abs(t.v).toFixed(2)}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Confetti particles */}
      <div className="pointer-events-none absolute inset-0">
        {confetti.map((c) => (
          <motion.span
            key={c.id}
            className="absolute block"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: c.r,
              height: c.r * 3,
              borderRadius: 2,
              background:
                Math.random() > 0.5 ? "rgba(0,224,255,.9)" : "rgba(155,92,255,.9)",
            }}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: -40 - Math.random() * 40, x: c.tx, rotate: c.rot }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            exit={{ opacity: 0 }}
          />
        ))}
      </div>

      {/* CSS keyframe for the animated ring */}
      <style jsx>{`
        @keyframes ringShift {
          to {
            background-position: 200% 0;
          }
        }
      `}</style>
    </motion.div>
  );
}
