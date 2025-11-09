"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, type MotionProps, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, CreditCard, Globe2 } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ======================================================
   TYPES
   ====================================================== */

type Floater = {
  src: string;
  alt?: string;
  className?: string; // Tailwind positions/sizing
  style?: CSSProperties;
  initial?: MotionProps["initial"];
  animate?: MotionProps["animate"];
  transition?: MotionProps["transition"];
  noDefaultAnim?: boolean;
};

type Chip = {
  text: string;
  className?: string; // position
  loopMs?: number; // fade loop duration
  delay?: number;
};

export type HeroSlide = {
  /** Optional slide-specific background image/gradient */
  bg?: string; // url('/hero/slide1.jpg') or CSS gradient
  /** (NEW) Add classes for mobile-only background zoom/focus, e.g. "scale-[1.15] sm:scale-100" */
  mobileBgClass?: string;

  /** Left column (copy / glass block) */
  left: ReactNode;
  /** Right column (card, mockup, etc.) */
  right?: ReactNode;
  /** Floating images around the right visuals */
  floaters?: Floater[];
  /** Floating glass chips */
  chips?: Chip[];

  /** Optional regulatory or clarification copy under left column */
  disclaimer?: ReactNode;
};

type Props = {
  /** Three (or more) slides that rotate inside this single hero */
  slidesData: HeroSlide[];

  /** Controlled index; omit to use internal autoplay state */
  index?: number;
  onIndexChange?: (i: number) => void;

  /** Autoplay controls */
  autoplay?: boolean;
  slideIntervalMs?: number;

  /** Disable motion for accessibility/perf */
  disableMotion?: boolean;

  /** Optional grain texture url */
  grain?: string;

  /** Optional: render your own controls */
  renderControls?: (args: {
    index: number;
    count: number;
    onPrev: () => void;
    onNext: () => void;
    onDot: (i: number) => void;
  }) => ReactNode;
};

/* ======================================================
   PARALLAX HERO (UPGRADED)
   - Adds autoplay progress bar
   - Keyboard + swipe support
   - Visually stronger controls
   - Optional per-slide disclaimer
   ====================================================== */
export default function ParallaxHero({
  slidesData,
  index,
  onIndexChange,
  autoplay = true,
  slideIntervalMs = 6000,
  disableMotion = false,
  grain = "/textures/grain.png",
  renderControls,
}: Props) {
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const motionOn = !disableMotion && !prefersReduced;

  /* Background parallax */
  useEffect(() => {
    if (!motionOn || !bgRef.current) return;
    const triggerEl = bgRef.current.parentElement ?? bgRef.current;
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current!, {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: triggerEl, scrub: true },
      });
    }, bgRef);
    return () => ctx.revert();
  }, [motionOn]);

  /* Foreground gentle drift */
  useEffect(() => {
    if (!motionOn || !fgRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(fgRef.current!, {
        y: 12,
        duration: 2.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    }, fgRef);
    return () => ctx.revert();
  }, [motionOn]);

  /* Aurora + sparks breathing loop */
  useEffect(() => {
    if (!motionOn) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
      const aurora = auroraRef.current;
      if (aurora) tl.to(aurora, { y: -8, x: 10, duration: 3.2, opacity: 0.95 }, 0);
      const dots = sparksRef.current?.querySelectorAll<HTMLElement>(".spark");
      if (dots && dots.length) {
        tl.to(dots, { y: -6, duration: 2.4, stagger: { each: 0.12, from: "random" } }, 0);
      }
    }, fgRef);
    return () => ctx.revert();
  }, [motionOn]);

  /* Slider state */
  const isControlled = typeof index === "number";
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = isControlled ? (index as number) : internalIndex;

  const setActive = (i: number | ((p: number) => number)) => {
    const next = typeof i === "function" ? (i as (p: number) => number)(activeIndex) : i;
    if (isControlled) onIndexChange?.(next);
    else setInternalIndex(next);
  };

  const count = slidesData.length;
  const onPrev = () => setActive((p) => (p - 1 + count) % count);
  const onNext = () => setActive((p) => (p + 1) % count);
  const onDot = (i: number) => setActive(i);

  /* Autoplay + progress */
  useEffect(() => {
    if (!autoplay || prefersReduced || count < 2) return;
    if (isControlled && !onIndexChange) return;

    // reset progress bar
    if (progressRef.current) {
      progressRef.current.style.width = "0%";
      progressRef.current.getAnimations().forEach((a) => a.cancel());
      progressRef.current.animate([{ width: "0%" }, { width: "100%" }], {
        duration: slideIntervalMs,
        easing: "linear",
        fill: "forwards",
      });
    }

    const id = setInterval(onNext, slideIntervalMs);
    return () => clearInterval(id);
  }, [autoplay, prefersReduced, slideIntervalMs, count, isControlled, onIndexChange, activeIndex]);

  /* Keyboard + swipe */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);

    let startX = 0;
    let dx = 0;
    const onPointerDown = (e: PointerEvent) => {
      startX = e.clientX; dx = 0; el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => { if (startX) dx = e.clientX - startX; };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.abs(dx) > 60) (dx < 0 ? onNext : onPrev)();
      startX = 0; dx = 0;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [count]);

  const slide = slidesData[activeIndex];

  /* Helpers */
  const defaultEntry = (
    delay: number
  ): Pick<MotionProps, "initial" | "animate" | "transition"> => ({
    initial: prefersReduced ? false : { opacity: 0, y: 22, filter: "blur(6px)" },
    animate: prefersReduced ? {} : { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay },
  });

  return (
    <header
      ref={containerRef}
      className="relative overflow-hidden bg-hero outline-none"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Featured banking highlights"
    >
      {/* Global gradient/parallax base */}
      <div
        ref={bgRef}
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(900px 480px at 50% -10%, rgba(0,212,255,.16), transparent), linear-gradient(180deg,#0B0F14 0%, #101826 100%)",
          maskImage: "radial-gradient(1200px 600px at 50% 0%, black, transparent)",
          WebkitMaskImage: "radial-gradient(1200px 600px at 50% 0%, black, transparent)",
        }}
        aria-hidden
      />

      {/* Per-slide background (image/gradient) */}
      <AnimatePresence mode="wait">
        {slide?.bg && (
          <motion.div
            key={`bg-${activeIndex}`}
            className="absolute inset-0 -z-10 pointer-events-none"
            initial={{ opacity: 0, x: 30, filter: "blur(6px)" }}
            animate={{ opacity: 0.35, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -30, filter: "blur(6px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            aria-hidden
          >
            {slide.bg.startsWith("url(") ? (
              <div
                className={`absolute inset-0 bg-cover bg-center transform-gpu ${slide.mobileBgClass ?? ""}`}
                style={{ backgroundImage: slide.bg }}
              />
            ) : (
              <div className="w-full h-full" style={{ background: slide.bg }} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grain overlay */}
      {grain && (
        <div
          className="absolute inset-0 opacity-[.06] mix-blend-overlay pointer-events-none -z-10"
          style={{ backgroundImage: `url(${grain})`, backgroundSize: "600px" }}
          aria-hidden
        />
      )}

      {/* Slide content */}
      <section className="relative z-10 container-x section-pad grid lg:grid-cols-2 gap-8 items-center">
        {/* Left column (animated per slide) */}
        <AnimatePresence mode="wait">
          <motion.div key={`left-${activeIndex}`} {...defaultEntry(0)}>
            {slide.left}
            {slide.disclaimer && (
              <div className="mt-4 text-[12px] text-white/60 leading-relaxed">{slide.disclaimer}</div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right column (animated per slide) */}
        <div className="mt-8 lg:mt-0">
          <AnimatePresence mode="wait">
            <motion.div key={`right-${activeIndex}`} {...defaultEntry(0.05)}>
              {slide.right}
            </motion.div>
          </AnimatePresence>

          {/* Floaters + Chips tied to right column */}
          <div ref={fgRef} className="relative mt-6 h-[320px] md:h-[380px] z-10">
            <AnimatePresence mode="popLayout">
              {slide.floaters?.map((f, idx) => {
                const defs = f.noDefaultAnim ? {} : defaultEntry(0.1 + idx * 0.08);
                return (
                  <motion.img
                    key={`${activeIndex}-${f.src}-${idx}`}
                    src={f.src}
                    alt={f.alt ?? ""}
                    className={`absolute drop-shadow-2xl select-none ${f.className ?? ""}`}
                    draggable={false}
                    style={f.style}
                    initial={f.initial ?? defs.initial}
                    animate={f.animate ?? defs.animate}
                    exit={{ opacity: 0, y: 10, filter: "blur(3px)" }}
                    transition={f.transition ?? defs.transition}
                  />
                );
              })}
            </AnimatePresence>

            <AnimatePresence>
              {slide.chips?.map((c, i) => (
                <motion.div
                  key={`${activeIndex}-chip-${i}`}
                  className={`absolute rounded-xl px-3 py-2 text-xs text-white/90 bg-white/10 backdrop-blur-md ring-1 ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${c.className ?? ""}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [-2, 0, -6, -10] }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: c.loopMs ?? 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: c.delay ?? i * 0.6,
                  }}
                >
                  <span className="pointer-events-none absolute inset-[1px] rounded-[11px] [background:linear-gradient(90deg,#00D4FF66,#00E0FF33)] opacity-50" />
                  <span className="relative">{c.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Aurora behind */}
            <div
              ref={auroraRef}
              className="pointer-events-none absolute inset-x-0 bottom-[-40px] h-[220px] -z-10"
              style={{
                background:
                  "radial-gradient(420px 180px at 55% 30%, rgba(0,212,255,.18), transparent 70%), radial-gradient(520px 220px at 30% 70%, rgba(0,255,166,.12), transparent 70%)",
                filter: "blur(50px)",
                opacity: 0.9,
              }}
              aria-hidden
            />
            {/* Sparks */}
            <div ref={sparksRef} className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="spark absolute w-[6px] h-[6px] rounded-full"
                  style={{
                    left: `${30 + i * 6}%`,
                    top: `${60 + (i % 3) * 10}%`,
                    opacity: 0.12 + (i % 3) * 0.06,
                    boxShadow:
                      "0 0 16px rgba(0, 224, 255, .35), 0 0 2px rgba(0, 224, 255, .9)",
                    background: "rgba(0,224,255,.7)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Progress bar */}
      <div className="absolute left-0 right-0 bottom-[58px] md:bottom-[54px] h-[2px] bg-white/10">
        <div ref={progressRef} className="h-full bg-white/60" />
      </div>

      {/* Controls (yours or built-in simple dots/prev/next) */}
      <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-between px-4 md:px-6 pointer-events-none">
        {renderControls ? (
          renderControls({ index: activeIndex, count, onPrev, onNext, onDot })
        ) : (
          <>
            <button
              onClick={onPrev}
              className="pointer-events-auto rounded-full border border-white/20 bg-black/30 px-3 py-2 backdrop-blur-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Previous slide"
            >
              ‹
            </button>

            <div className="pointer-events-auto flex items-center gap-2">
              {Array.from({ length: count }).map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => onDot(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2.5 w-2.5 rounded-full ${
                    i === activeIndex ? "bg-white/80" : "bg-white/30"
                  }`}
                  whileHover={{ scale: 1.2 }}
                />
              ))}
            </div>

            <button
              onClick={onNext}
              className="pointer-events-auto rounded-full border border-white/20 bg-black/30 px-3 py-2 backdrop-blur-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Next slide"
            >
              ›
            </button>
          </>
        )}
      </div>
    </header>
  );
}

/* ======================================================
   DEMO USAGE WITH STRONGER, MORE PERSUASIVE COPY
   Drop this into a page and swap your assets.
   ====================================================== */
export function HeroDemo() {
  const Glass = ({ children }: { children: ReactNode }) => (
    <div className="relative rounded-2xl p-6 md:p-8 bg-white/5 border border-white/10 backdrop-blur-xl">
      <span className="absolute inset-[1px] rounded-[14px] pointer-events-none [background:linear-gradient(90deg,#00D4FF33,#00E0FF22)] opacity-60" />
      <div className="relative">{children}</div>
    </div>
  );

  const Primary = ({ children }: { children: ReactNode }) => (
    <button className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium bg-[linear-gradient(180deg,#00D4FF,#00B4D8)] text-[#0B0F14] shadow-[0_10px_30px_rgba(0,212,255,.35)] hover:scale-[1.01] active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-[#00E0FF]/40">
      {children}
    </button>
  );
  const Ghost = ({ children }: { children: ReactNode }) => (
    <button className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border border-white/15 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30">
      {children}
    </button>
  );

  const slides: HeroSlide[] = [
    {
      bg: "url(/Hero/vault.jpg)",
      mobileBgClass: "scale-110 sm:scale-100",
      left: (
        <Glass>
          <div className="mb-3 text-[12px] uppercase tracking-[0.18em] text-white/70 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Bank‑grade security • Real human support 24/7
          </div>
          <h1 className="text-3xl md:text-[44px] leading-[1.08] font-semibold tracking-tight">
            The money OS that keeps your <span className="text-[#00E0FF]">cash safe</span> and
            <span className="text-[#00E0FF]"> working</span>.
          </h1>
          <p className="mt-4 text-white/80 text-[15px] md:text-[16px] leading-relaxed">
            Open an account in <strong>2 minutes</strong>, earn on idle balances, set spending
            limits, and move money globally with <strong>zero paper forms</strong>.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Primary>
              Get started <ArrowRight className="h-4 w-4" />
            </Primary>
            <Ghost>See how it works</Ghost>
          </div>

          {/* Trust micro‑proofs */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-2xl font-semibold">99.995%</div>
              <div className="text-[12px] text-white/60">Uptime last 12 months</div>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-2xl font-semibold">10m+</div>
              <div className="text-[12px] text-white/60">Monthly transactions</div>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-2xl font-semibold">₦0</div>
              <div className="text-[12px] text-white/60">Account opening fee</div>
            </div>
          </div>
        </Glass>
      ),
      right: (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="text-sm text-white/70">Smart Vault</div>
            <div className="mt-1 text-2xl font-semibold">Auto‑save 10%</div>
            <div className="mt-2 text-[12px] text-white/60">Round‑ups + salary skim</div>
          </div>
          <div className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="text-sm text-white/70">Goals</div>
            <div className="mt-1 text-2xl font-semibold">New MacBook</div>
            <div className="mt-2 text-[12px] text-white/60">62% funded — 3 weeks early</div>
          </div>
          <div className="col-span-2 rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/70">Spend Insights</div>
              <Zap className="h-4 w-4 text-[#00E0FF]" />
            </div>
            <div className="mt-2 h-24 rounded-lg bg-black/30" />
          </div>
        </div>
      ),
      floaters: [
        { src: "/ui/lock.png", className: "left-2 bottom-6 w-[90px]" },
        { src: "/ui/shield.png", className: "right-6 top-2 w-[110px]" },
      ],
      chips: [
        { text: "Face/Touch ID", className: "left-6 top-4" },
        { text: "Realtime fraud alerts", className: "right-10 bottom-10" },
      ],
      disclaimer: (
        <>
          * Funds held with licensed partners. Card issuance by regulated providers. Features vary by region.
        </>
      ),
    },
    {
      bg: "url(/Hero/cards.jpg)",
      mobileBgClass: "scale-110 sm:scale-100",
      left: (
        <Glass>
          <div className="mb-3 text-[12px] uppercase tracking-[0.18em] text-white/70 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Cards & Payments
          </div>
          <h2 className="text-3xl md:text-[40px] leading-[1.08] font-semibold tracking-tight">
            One card, <span className="text-[#00E0FF]">everywhere</span> you pay.
          </h2>
          <p className="mt-4 text-white/80 text-[15px] md:text-[16px] leading-relaxed">
            Create <strong>virtual cards</strong> for subscriptions, freeze with one tap,
            and split bills that settle <strong>instantly</strong>—no calculators, no awkwardness.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Primary>
              Get your card <ArrowRight className="h-4 w-4" />
            </Primary>
            <Ghost>Add to Apple/Google Pay</Ghost>
          </div>

          {/* Micro-benefits */}
          <ul className="mt-6 grid grid-cols-2 gap-3 text-[13px] text-white/80">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white/60"/>Tap to pay</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white/60"/>Exchange‑rate lock</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white/60"/>Dynamic spending limits</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white/60"/>Merchant controls</li>
          </ul>
        </Glass>
      ),
      right: (
        <div className="relative">
          <div className="absolute -left-6 -top-4 rotate-[-6deg] w-[260px] h-[160px] rounded-2xl bg-gradient-to-br from-white/30 to-white/10 border border-white/20 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.5)]" />
          <div className="relative rotate-[8deg] w-[260px] h-[160px] rounded-2xl bg-gradient-to-br from-white/30 to-white/10 border border-white/20 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.5)]" />
          <div className="mt-24 rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="text-sm text-white/70">Auto‑split</div>
            <div className="mt-1 text-2xl font-semibold">Dinner with 5 friends</div>
            <div className="mt-2 text-[12px] text-white/60">Everyone pays ₦8,400 • Settled</div>
          </div>
        </div>
      ),
      floaters: [
        { src: "/ui/nfc.png", className: "left-4 top-2 w-[80px]" },
        { src: "/ui/wave.png", className: "right-8 bottom-8 w-[100px]" },
      ],
      chips: [
        { text: "Virtual • Disposable", className: "left-6 bottom-6" },
        { text: "Freeze card", className: "right-10 top-10" },
      ],
    },
    {
      bg: "url(/Hero/global.jpg)",
      mobileBgClass: "scale-110 sm:scale-100",
      left: (
        <Glass>
          <div className="mb-3 text-[12px] uppercase tracking-[0.18em] text-white/70 flex items-center gap-2">
            <Globe2 className="h-4 w-4" /> Global accounts
          </div>
          <h2 className="text-3xl md:text-[40px] leading-[1.08] font-semibold tracking-tight">
            Go <span className="text-[#00E0FF]">global</span> without the hidden fees.
          </h2>
          <p className="mt-4 text-white/80 text-[15px] md:text-[16px] leading-relaxed">
            Hold and convert in <strong>10+ currencies</strong>, receive international payments like a local,
            and track FX in real‑time—right inside your balance card.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Primary>
              Open multi‑currency <ArrowRight className="h-4 w-4" />
            </Primary>
            <Ghost>See conversion demo</Ghost>
          </div>

          {/* FX ticker */}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { p: "USD/NGN", v: "₦1,561" },
              { p: "GBP/NGN", v: "₦1,997" },
              { p: "EUR/NGN", v: "₦1,647" },
            ].map((x) => (
              <div key={x.p} className="rounded-xl border border-white/10 p-3">
                <div className="text-sm text-white/70">{x.p}</div>
                <div className="text-xl font-semibold">{x.v}</div>
              </div>
            ))}
          </div>
        </Glass>
      ),
      right: (
        <div className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="text-sm text-white/70">Conversion</div>
          <div className="mt-2 text-2xl font-semibold">$240 → ₦374,640</div>
          <div className="mt-2 text-[12px] text-white/60">Best rate applied • Fee ₦0</div>
          <div className="mt-4 h-24 rounded-lg bg-black/30" />
        </div>
      ),
      floaters: [
        { src: "/ui/globe.png", className: "left-6 top-8 w-[90px]" },
        { src: "/ui/plane.png", className: "right-8 bottom-6 w-[110px]" },
      ],
      chips: [
        { text: "Local IBAN / Account No.", className: "left-8 bottom-10" },
        { text: "No hidden FX fees", className: "right-8 top-8" },
      ],
    },
  ];

  return (
    <div className="bg-[#0B0F14] text-white">
      <ParallaxHero slidesData={slides} />
    </div>
  );
}
