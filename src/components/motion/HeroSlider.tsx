"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  chips?: string[];
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  // full-bleed art behind everything
  backdrop: string; // url(/imgs/hero-1.jpg)
  // optional foreground decorative/phone image that hugs the same side as text
  fg?: string;
  align?: "left" | "right" | "center"; // where the glass card sits
};

export default function HeroSlider({
  slides,
  autoMs = 7000,
}: {
  slides: Slide[];
  autoMs?: number;
}) {
  const [i, setI] = useState(0);
  const go = (n: number) => setI((p) => (p + n + slides.length) % slides.length);
  const active = slides[i];

  // autoplay (pause on hover)
  useEffect(() => {
    const id = setInterval(() => go(1), autoMs);
    return () => clearInterval(id);
  }, [i, autoMs]);

  const alignClasses = useMemo(() => {
    switch (active.align ?? "left") {
      case "left":
        return "items-start md:items-center justify-start md:justify-start";
      case "right":
        return "items-start md:items-center justify-end md:justify-end";
      case "center":
        return "items-start md:items-center justify-center";
    }
  }, [active.align]);

  return (
    <section className="relative h-[86vh] min-h-[640px] overflow-hidden">
      {/* Backdrop (full canvas) */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={active.id + "-bg"}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            backgroundImage: `url(${active.backdrop})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(1.05) contrast(1.03)",
          }}
        />
      </AnimatePresence>

      {/* Vignette + brand tint for “transmorphic” feel */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_30%,rgba(0,228,255,0.12)_0%,transparent_55%),radial-gradient(70%_50%_at_30%_70%,rgba(0,255,166,0.10)_0%,transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,14,0.35)_0%,rgba(6,10,14,0.55)_60%,rgba(6,10,14,0.75)_100%)]" />

      {/* Content layer: card + optional foreground image live on SAME side */}
      <div className={`relative z-10 h-full mx-auto max-w-[1200px] px-5 md:px-8 flex ${alignClasses}`}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={active.id + "-card"}
            className="relative w-full md:w-[560px] lg:w-[620px]"
            initial={{ y: 20, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -20, opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Transmorphic / glass card */}
            <div className="group relative rounded-2xl md:rounded-3xl border border-white/12 bg-white/6 backdrop-blur-xl p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
              {/* gradient hairline */}
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl p-[1px]">
                <div className="h-full w-full rounded-[inherit] bg-[linear-gradient(90deg,rgba(0,212,255,.35),rgba(0,255,166,.35))] opacity-30" />
              </div>

              {active.eyebrow && (
                <p className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-white/70 mb-2">
                  {active.eyebrow}
                </p>
              )}
              <h1 className="text-[36px] leading-[1.05] md:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
                {active.title}
              </h1>
              <p className="mt-4 text-white/80 text-[15px] md:text-[17px] leading-relaxed">
                {active.body}
              </p>

              {active.chips && active.chips.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {active.chips.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1.5 rounded-full text-[12px] md:text-[13px] text-white/90 bg-white/10 border border-white/15"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {active.ctaPrimary && (
                  <a
                    href={active.ctaPrimary.href}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-medium"
                  >
                    {active.ctaPrimary.label}
                    <ArrowRight size={18} />
                  </a>
                )}
                {active.ctaSecondary && (
                  <a
                    href={active.ctaSecondary.href}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border border-white/20 bg-white/8 hover:bg-white/12 text-white"
                  >
                    {active.ctaSecondary.label}
                  </a>
                )}
              </div>
            </div>

            {/* Optional foreground image that “hugs” the same side as the card */}
            {active.fg && (
              <motion.img
                key={active.id + "-fg"}
                src={active.fg}
                alt=""
                className={`absolute hidden md:block ${
                  (active.align ?? "left") === "right"
                    ? "right-[-220px] top-1/2 -translate-y-1/2 w-[420px]"
                    : "left-[-220px] top-1/2 -translate-y-1/2 w-[420px]"
                } rounded-[28px] border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,.55)]`}
                initial={{ opacity: 0, y: 20, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -20, rotate: -2 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="absolute bottom-5 left-0 right-0 px-5 md:px-8">
        <div className="mx-auto max-w-[1200px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous"
              onClick={() => go(-1)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/14 backdrop-blur-md border border-white/15 text-white flex items-center justify-center"
            >
              <ChevronLeft />
            </button>
            <button
              aria-label="Next"
              onClick={() => go(1)}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/14 backdrop-blur-md border border-white/15 text-white flex items-center justify-center"
            >
              <ChevronRight />
            </button>
          </div>

          <div className="flex items-center gap-6">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                aria-label={`Go to ${idx + 1}`}
                onClick={() => setI(idx)}
                className={`h-[6px] md:h-[8px] rounded-full transition-all ${
                  idx === i
                    ? "w-10 bg-white/90"
                    : "w-5 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
