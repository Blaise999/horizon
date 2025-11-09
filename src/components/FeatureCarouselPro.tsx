"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

/* ──────────────────────────────────────────────────────────
   CONFIG
   ────────────────────────────────────────────────────────── */

type Feature = {
  key: string;
  title: string;
  desc: string;
  img: string;
  color: string;
};

const FEATURES: Feature[] = [
  {
    key: "cards",
    title: "Cards",
    desc: "Freeze/unfreeze instantly. Virtual cards with one-tap controls.",
    img: "/hero/cards-showcase.png",
    color: "from-[#00D2FF] to-[#00FFA6]",
  },
  {
    key: "payments",
    title: "Payments",
    desc: "Split bills, instant transfers, scan to pay. No account number stress.",
    img: "/hero/payments-showcase.png",
    color: "from-[#FF8CFF] to-[#6F00FF]",
  },
  {
    key: "savings",
    title: "Savings",
    desc: "Round-ups and goals that grow quietly in the background.",
    img: "/hero/savings-showcase.png",
    color: "from-[#FFD233] to-[#FF8C00]",
  },
  {
    key: "fx",
    title: "FX & Global",
    desc: "Hold multiple currencies, swap at live rates, spend anywhere.",
    img: "/hero/global-showcase.png",
    color: "from-[#00E0FF] to-[#0066FF]",
  },
  {
    key: "insights",
    title: "Insights",
    desc: "See trends, categories, and nudges that keep you in control.",
    img: "/hero/insights-showcase.png",
    color: "from-[#33D69F] to-[#00715E]",
  },
];

const AUTOPLAY_MS = 4200;

/* ──────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────── */

export default function FeatureCarouselPro() {
  const [index, setIndex] = useState(0);
  const count = FEATURES.length;
  const prefersReduced = useReducedMotion();
  const hoverRef = useRef(false);
  const visRef = useRef(true);

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  // autoplay (pause on hover or tab hidden)
  useEffect(() => {
    const onVis = () => (visRef.current = document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const id = setInterval(() => {
      if (!hoverRef.current && visRef.current) next();
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [next, prefersReduced]);

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const feature = FEATURES[index];

  /* ────────────────────────────────────────────────────────── */

  return (
    <section
      className="relative py-20 sm:py-24 overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Core Banking Powers"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      {/* Header */}
      <div className="text-center mb-12 px-6">
        <p className="text-xs uppercase text-white/50 tracking-[0.25em] mb-2">
          Explore
        </p>
        <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-semibold tracking-tight">
          Core Banking Powers
        </h2>
      </div>

      {/* Content */}
      <div className="relative flex flex-col lg:flex-row items-center justify-center px-6 md:px-10 gap-10 sm:gap-14">
        {/* Left Button */}
        <button
          onClick={prev}
          aria-label="Previous"
          className="hidden sm:flex absolute left-4 md:left-10 z-10 text-white/70 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60 rounded-full p-2"
        >
          <ChevronLeft />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={feature.key}
            initial={{ opacity: 0, x: 80, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-6xl flex flex-col lg:flex-row items-center gap-8 sm:gap-12"
          >
            {/* IMAGE FIRST on mobile for visual hook */}
            <div className="w-full lg:w-7/12 mb-6 sm:mb-0">
              <TiltMockup
                img={feature.img}
                title={feature.title}
                gradient={feature.color}
              />
            </div>

            {/* TEXT */}
            <div className="lg:w-5/12 text-center lg:text-left">
              <h3 className="text-[clamp(1.4rem,3.5vw,2rem)] font-medium mb-3">
                {feature.title}
              </h3>
              <p className="text-white/70 leading-relaxed mb-6 text-[clamp(.9rem,2.5vw,1rem)]">
                {feature.desc}
              </p>

              <button
                onClick={next}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 active:scale-[.97] transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              >
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right Button */}
        <button
          onClick={next}
          aria-label="Next"
          className="hidden sm:flex absolute right-4 md:right-10 z-10 text-white/70 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60 rounded-full p-2"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-12 flex justify-center gap-2" role="tablist" aria-label="Slides">
        {FEATURES.map((f, i) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={i === index}
            aria-controls={`panel-${f.key}`}
            onClick={() => go(i)}
            className={`h-2.5 w-2.5 rounded-full transition outline-none focus:ring-2 focus:ring-cyan-400/60 ${
              i === index ? "bg-white" : "bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-10 px-6">
        <a
          href="#deep-dive"
          className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-[#00D2FF] to-[#00FFA6] font-medium text-black hover:brightness-110 transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
        >
          See how it works
        </a>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   TILT MOCKUP (responsive + subtle parallax)
   ────────────────────────────────────────────────────────── */

function TiltMockup({
  img,
  title,
  gradient,
}: {
  img: string;
  title: string;
  gradient: string;
}) {
  const prefersReduced = useReducedMotion();
  const rafRef = useRef<number | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, s: 1 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const ry = (px - 0.5) * 10;
    const rx = (0.5 - py) * 10;
    const s = 1.02;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setTilt({ rx, ry, s }));
  };

  const onLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setTilt({ rx: 0, ry: 0, s: 1 }));
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} p-[2px] w-full max-w-[480px] sm:max-w-none mx-auto`}
    >
      <div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="bg-[#0F1622] rounded-2xl p-3 relative shadow-[0_10px_30px_rgba(0,0,0,.4)]"
        style={
          !prefersReduced
            ? {
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.s})`,
                transition: "transform 180ms ease",
                transformStyle: "preserve-3d",
                perspective: 1000,
              }
            : undefined
        }
      >
        <Image
          src={img}
          alt={title}
          width={720}
          height={480}
          className="rounded-xl object-cover w-full h-auto"
          priority
        />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
      </div>
    </div>
  );
}