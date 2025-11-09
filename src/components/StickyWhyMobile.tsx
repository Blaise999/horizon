"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import Image from "next/image";
import { ArrowRight, CreditCard, BarChart3, ShieldCheck } from "lucide-react";

/* ----------------------------------------------------------
   Floating mini-image (tiny pic) that drifts up and rotates
   (Sized so they’re clearly visible)
----------------------------------------------------------- */
function FloatingPic({
  src,
  size = 22, // bigger so it’s noticeable
  className = "",
  delay = 0,
  drift = 16,
  duration = 7,
}: {
  src: string;
  size?: number;
  className?: string;
  delay?: number;
  drift?: number;
  duration?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className={`absolute z-20 will-change-transform ${className}`}
      initial={{ y: 0, rotate: -4, opacity: 0 }}
      animate={{ y: [0, -drift, 0], rotate: [-4, 6, -4], opacity: [0.7, 1, 0.7] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <Image src={src} alt="" width={size} height={size} className="opacity-90" draggable={false} />
    </motion.div>
  );
}

/* ----------------------------------------------------------
   Panel: full-bleed IMAGE background + glass overlay copy
   Fonts grow as panel crosses the focus band
----------------------------------------------------------- */
const Panel = ({
  icon,
  title,
  body,
  bullets = [],
  tinyPics = [],
  index,
  imgSrc = "/Hero/window.png",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  bullets?: string[];
  /** three tiny images per panel, e.g. ["/Hero/file.png", "/Hero/globe.png", "/Hero/window.png"] */
  tinyPics?: string[];
  index: number;
  imgSrc?: string;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Larger focus window so growth is obvious
  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ["start 92%", "end 8%"],
  });

  // Card lift + halo
  const cardScale = useTransform(scrollYProgress, [0, 1], [0.96, 1.04]);
  const ringOpacity = useTransform(scrollYProgress, [0, 1], [0.12, 0.6]);

  // 0→1 progress for font calcs
  const t = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Font sizes via calc() so it REALLY grows
  const titleSize = useMotionTemplate`calc(18px + ${t} * 18px)`; // 18→36
  const bodySize = useMotionTemplate`calc(14px + ${t} * 8px)`;   // 14→22
  const bulletSize = useMotionTemplate`calc(13px + ${t} * 5px)`; // 13→18
  const titleOpacity = useTransform(t, [0, 1], [0.65, 1]);
  const bodyOpacity = useTransform(t, [0, 1], [0.72, 0.98]);

  return (
    <motion.section
      ref={panelRef}
      style={{ scale: cardScale }}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.65 }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      className="snap-start min-h-[92vh] rounded-3xl ring-1 ring-white/10 mx-3 relative overflow-hidden will-change-transform"
    >
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={imgSrc}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {/* Darken for copy legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F14]/65 via-[#0B0F14]/35 to-[#0B0F14]/70" />
      </div>

      {/* Soft outer halo that strengthens at focus */}
      <motion.div
        style={{ opacity: ringOpacity }}
        className="pointer-events-none absolute -inset-10 rounded-[inherit] bg-[radial-gradient(70%_55%_at_50%_0%,rgba(0,224,255,.12),transparent)]"
      />

      {/* tiny floating pics (3) */}
      {tinyPics[0] && <FloatingPic src={tinyPics[0]} className="left-5 top-8" delay={index * 0.15} />}
      {tinyPics[1] && <FloatingPic src={tinyPics[1]} className="right-6 top-14" delay={0.8 + index * 0.2} />}
      {tinyPics[2] && <FloatingPic src={tinyPics[2]} className="left-10 bottom-12" delay={1.4 + index * 0.25} />}

      {/* Glass overlay card for copy */}
      <div className="relative z-10 mx-auto mt-20 mb-8 w-[92%] rounded-2xl bg-white/10 backdrop-blur-2xl ring-1 ring-white/15 p-5 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
        {/* top accent */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] opacity-80"
          style={{ background: "linear-gradient(90deg,rgba(0,224,255,.9),rgba(155,92,255,.6))" }}
        />

        {/* header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
            {icon}
          </div>
          <motion.h3
            style={{ fontSize: titleSize, opacity: titleOpacity }}
            className="origin-left font-semibold tracking-tight"
          >
            {title}
          </motion.h3>
        </div>

        <motion.p style={{ fontSize: bodySize, opacity: bodyOpacity }} className="mt-2 text-white/80">
          {body}
        </motion.p>

        {bullets.length > 0 && (
          <motion.ul style={{ fontSize: bulletSize, opacity: bodyOpacity }} className="mt-3 space-y-2 text-white/80 list-none">
            {bullets.map((b) => (
              <li key={b} className="before:content-['•'] before:mr-2 before:text-white/60">
                {b}
              </li>
            ))}
          </motion.ul>
        )}

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-sm font-medium"
        >
          Learn more <ArrowRight size={14} />
        </motion.button>
      </div>
    </motion.section>
  );
};

/* ----------------------------------------------------------
   StickyWhyMobile wrapper WITHOUT the phone container
----------------------------------------------------------- */
export default function StickyWhyMobile() {
  const wrapRef = useRef<HTMLDivElement>(null);
  // Only panels; no sticky phone container.

  return (
    <div ref={wrapRef} className="md:hidden relative">
      {/* panels */}
      <div className="relative z-10 snap-y snap-mandatory space-y-6 pt-8 pb-24">
        <Panel
          index={0}
          icon={<ShieldCheck size={14} />}
          title="Security that stays out of the way"
          body="Biometric step-up, device binding, and behavioral risk scoring. No friction unless risk spikes."
          bullets={["Inline fraud checks (< 50ms)", "Card-present / CNP anomaly detection", "One-tap approve/deny on push"]}
          imgSrc="/Hero/security.jpg"
          tinyPics={["/Hero/file.png", "/Hero/globe.png", "/Hero/window.png"]}
        />

        <Panel
          index={1}
          icon={<CreditCard size={14} />}
          title="Cards that obey"
          body="Freeze, set limits, and spin disposable virtual cards for trials or one-off purchases."
          bullets={["Per-merchant/category rules", "Subs auto-renew guardrails", "Country & channel controls"]}
          imgSrc="/Hero/card2.jpg"
          tinyPics={["/Hero/next.png", "/Hero/vercel.png", "/Hero/globe.png"]}
        />

        <Panel
          index={2}
          icon={<BarChart3 size={14} />}
          title="Clarity on spend"
          body="Live categories, trends, burn-rate, and safe-to-spend. Export CSV/PDF in a tap."
          bullets={["Merchant logos & locations", "Goal-aware nudges (not spam)", "Weekly digest that actually helps"]}
          imgSrc="/Hero/insights.jpg"
          tinyPics={["/Hero/window.png", "/Hero/file.png", "/Hero/vercel.png"]}
        />
      </div>
    </div>
  );
}
