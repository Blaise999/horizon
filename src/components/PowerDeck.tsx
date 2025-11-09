"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Pause, Play } from "lucide-react";

/** ──────────────────────────────────────────────────────────────────────
 *  POWER • DECK  —  a Revolut-style, full-bleed slide deck
 *  • Full-screen slides (like PowerPoint)
 *  • Ken-Burns on media, parallax text, aurora tint, orbit glow
 *  • Autoplay with progress bar (pauses on hover / tab hidden)
 *  • Touch swipe + keyboard arrows
 *  • Accessible (roledescription=carousel)
 *  Drop your /public images in the sources below.
 *  ──────────────────────────────────────────────────────────────────── */

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  img: string;       // /public path
  tintFrom: string;  // tailwind color hex
  tintTo: string;    // tailwind color hex
};

const SLIDES: Slide[] = [
  {
    key: "cards",
    eyebrow: "Horizon • Cards",
    title: "Freeze. Unfreeze. Virtual in a tap.",
    body: "Cards that move with you — control, limits, and instant issuance.",
    img: "/hero/cards-showcase.png",
    tintFrom: "#00D2FF",
    tintTo: "#00FFA6",
  },
  {
    key: "payments",
    eyebrow: "Payments",
    title: "Split bills. Instant transfers. Scan to pay.",
    body: "No account number stress — just tap, scan, and go.",
    img: "/hero/payments-showcase.png",
    tintFrom: "#6F00FF",
    tintTo: "#FF8CFF",
  },
  {
    key: "savings",
    eyebrow: "Savings",
    title: "Round-ups that grow quietly.",
    body: "Set goals and watch automated micro-saves stack up.",
    img: "/hero/savings-showcase.png",
    tintFrom: "#FFD233",
    tintTo: "#FF8C00",
  },
  {
    key: "fx",
    eyebrow: "FX & Global",
    title: "Hold, swap, and spend worldwide.",
    body: "Live rates across currencies — seamless at checkout.",
    img: "/hero/global-showcase.png",
    tintFrom: "#00E0FF",
    tintTo: "#0066FF",
  },
  {
    key: "insights",
    eyebrow: "Insights",
    title: "Know where every ₦ goes.",
    body: "Trends, categories, and gentle nudges that keep you in control.",
    img: "/hero/insights-showcase.png",
    tintFrom: "#33D69F",
    tintTo: "#00715E",
  },
];

const AUTOPLAY = 5200;

export default function PowerDeck() {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion();
  const hover = useRef(false);
  const visible = useRef(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);

  // visibility pause
  useEffect(() => {
    const onVis = () => (visible.current = document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // autoplay + smooth progress
  useEffect(() => {
    if (!playing || reduced) return;
    let last = performance.now();
    let p = 0;
    const tick = (now: number) => {
      const dt = now - last; last = now;
      if (!hover.current && visible.current) {
        p += dt / AUTOPLAY;
        if (p >= 1) { p = 0; setI((v) => (v + 1) % SLIDES.length); }
        setProgress(p);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [i, playing, reduced]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((v) => (v + 1) % SLIDES.length);
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + SLIDES.length) % SLIDES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // touch swipe
  const touch = useRef<{x:number;y:number}|null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    touch.current = null;
    if (Math.abs(dx) > 40) setI((v) => (v + (dx < 0 ? 1 : -1) + SLIDES.length) % SLIDES.length);
  };

  const s = SLIDES[i];

  return (
    <section
      className="relative h-[86vh] md:h-[92vh] w-full overflow-hidden rounded-3xl bg-[#0B111A] ring-1 ring-white/10"
      aria-roledescription="carousel"
      aria-label="Core Banking Powers"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Aurora tint */}
      <Aurora from={s.tintFrom} to={s.tintTo} />

      {/* Orbit glow ring */}
      <Orbit />

      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={s.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <KenBurnsMedia src={s.img} alt={s.title} />

          {/* Gradient scrim for legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />
        </motion.div>
      </AnimatePresence>

      {/* Text block (parallax) */}
      <motion.div
        className="absolute inset-x-6 md:inset-x-10 bottom-10 md:bottom-14 max-w-3xl"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 16, mass: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 ring-1 ring-white/15 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.tintFrom }} />
          <span className="text-[12px] tracking-[0.18em] uppercase text-white/70">{s.eyebrow}</span>
        </div>

        <h2 className="mt-4 text-3xl md:text-5xl font-semibold leading-tight tracking-tight">
          {s.title}
        </h2>
        <p className="mt-3 text-white/75 md:text-lg">{s.body}</p>

        <div className="mt-6 flex items-center gap-4">
          <a
            href="#deep-dive"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-black font-medium bg-gradient-to-r from-[#00D2FF] to-[#00FFA6] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
          >
            See how it works <ArrowRight size={16} />
          </a>

          <button
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 ring-1 ring-white/15 hover:bg-white/12"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            <span className="hidden sm:inline text-white/70 text-sm">{playing ? "Pause" : "Play"}</span>
          </button>
        </div>
      </motion.div>

      {/* Progress & dots */}
      <div className="absolute left-0 right-0 top-4 md:top-6 flex justify-center gap-2">
        {SLIDES.map((slide, idx) => (
          <button
            key={slide.key}
            onClick={() => setI(idx)}
            className="group relative h-1.5 w-16 overflow-hidden rounded-full bg-white/15"
            aria-label={`Go to ${slide.title}`}
          >
            <span
              className={`absolute inset-y-0 left-0 ${idx === i ? "bg-white" : "bg-white/35 group-hover:bg-white/60"}`}
              style={{ width: idx === i ? `${Math.max(7, progress * 100)}%` : "7%", transition: "width 120ms linear" }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function KenBurnsMedia({ src, alt }: { src: string; alt: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ scale: 1.06, rotate: 0.001 }}
      animate={reduced ? { scale: 1 } : { scale: 1.16 }}
      transition={{ duration: 6.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
    </motion.div>
  );
}

function Aurora({ from, to }: { from: string; to: string }) {
  return (
    <div className="absolute inset-0 -z-0 opacity-60">
      <div
        className="absolute -inset-32 blur-3xl"
        style={{ background: `radial-gradient(60% 60% at 30% 20%, ${from}22, transparent 70%),
                               radial-gradient(60% 60% at 70% 80%, ${to}22, transparent 72%)` }}
      />
    </div>
  );
}

function Orbit() {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 opacity-30"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      style={{
        width: 1100, height: 1100, borderRadius: "50%",
        boxShadow: "inset 0 0 140px rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    />
  );
}
