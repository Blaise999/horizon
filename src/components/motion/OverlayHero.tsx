"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type OverlaySlide = {
  id: string;
  backdrop: string; // e.g. "/hero/slide1.jpg"
  eyebrow?: string;
  title: string;
  body?: string;
  cta?: { label: string; href: string };
  align?: "left" | "center" | "right";
};

export default function OverlayHero({
  slides,
  autoMs = 7000,
  start = 0,
}: {
  slides: OverlaySlide[];
  autoMs?: number;
  start?: number;
}) {
  const [i, setI] = useState(start);
  const go = (n: number) => setI((p) => (p + n + slides.length) % slides.length);
  const active = slides[i];

  // autoplay
  useEffect(() => {
    const id = setInterval(() => go(1), autoMs);
    return () => clearInterval(id);
  }, [i, autoMs]);

  // ✅ Fade + Parallax: use global viewport scroll
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll(); // no container arg -> viewport
  const y = useTransform(scrollYProgress, [0, 1], [0, 30]);      // bg drift down
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -20]); // glow counter-drift

  const justify =
    active.align === "right"
      ? "justify-end"
      : active.align === "center"
      ? "justify-center"
      : "justify-start";

  return (
    <section ref={sectionRef} className="relative h-[86vh] min-h-[620px] overflow-hidden">
      {/* BACKDROP (parallax + deck slide) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id + "-bg"}
          className="absolute inset-0"
          style={{ y }}
          initial={{ opacity: 0, scale: 1.02, x: 40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.98, x: -40 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${active.backdrop})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* VIGNETTE + gentle brand glow (readability) */}
      <motion.div className="absolute inset-0 bg-black/38" style={{ y: glowY }} />
      <motion.div
        aria-hidden
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(70% 55% at 70% 30%, rgba(0,228,255,.10), transparent 60%)",
            "radial-gradient(70% 55% at 30% 70%, rgba(0,255,166,.10), transparent 60%)",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />

      {/* OVERLAY CARD (glass) */}
      <div className={`relative z-10 h-full mx-auto max-w-[1200px] px-5 md:px-8 flex items-center ${justify}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id + "-card"}
            initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="w-full md:max-w-[640px] relative rounded-3xl p-6 md:p-8 bg-white/7 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_14px_60px_rgba(0,0,0,.45)]"
          >
            <div className="pointer-events-none absolute inset-0 rounded-3xl p-[1px]">
              <div className="h-full w-full rounded-[inherit] bg-[linear-gradient(90deg,rgba(0,212,255,.35),rgba(0,255,166,.35))] opacity-35" />
            </div>

            {active.eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.05 }}
                className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-white/75"
              >
                {active.eyebrow}
              </motion.p>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mt-1 text-white text-[40px] md:text-6xl font-semibold leading-[1.02]"
            >
              {active.title}
            </motion.h1>

            {active.body && (
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.08 }}
                className="mt-3 text-white/85 text-[16px] md:text-[18px] leading-relaxed"
              >
                {active.body}
              </motion.p>
            )}

            {active.cta && (
              <motion.a
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.12 }}
                href={active.cta.href}
                className="mt-6 inline-flex items-center justify-center rounded-2xl px-5 py-3 font-medium text-black"
                style={{ background: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {active.cta.label}
              </motion.a>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-6 left-0 right-0 px-5 md:px-8 z-10">
        <div className="mx-auto max-w-[1200px] flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => go(-1)}
              className="h-10 w-10 rounded-full bg-white/12 text-white backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center"
              aria-label="Previous"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={() => go(1)}
              className="h-10 w-10 rounded-full bg-white/12 text-white backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center"
              aria-label="Next"
            >
              <ChevronRight />
            </button>
          </div>
          <div className="flex gap-4">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setI(idx)}
                className={`h-[8px] rounded-full transition-all ${
                  idx === i ? "w-12 bg-white/95" : "w-6 bg-white/45 hover:bg-white/70"
                }`}
                aria-label={`Go to ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
