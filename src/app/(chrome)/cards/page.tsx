// app/cards/page.tsx (Rearranged layout, user image default + optional ?card= override)
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  ShieldCheck,
  QrCode,
  ArrowRightLeft,
  Eye,
  Lock,
  SmartphoneNfc,
  Globe2,
} from "lucide-react";
import NavBrand from "@/components/Navbrand";

/* ───────────────────────── Motion helpers ───────────────────────── */
const easeOut = [0.16, 1, 0.3, 1] as const;
const fadeUp = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: d, ease: easeOut },
  },
});

/* ───────────────────────── Small UI atoms ───────────────────────── */
function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 backdrop-blur-xl">
      {children}
    </div>
  );
}

/* Avoid TS noise for next/image onError */
function hideOnError(e: any) {
  if (e?.currentTarget) e.currentTarget.style.display = "none";
}

/* ───────────────────────── Page ───────────────────────── */
export default function CardsPage() {
  const prefersReduced = useReducedMotion();
  const searchParams = useSearchParams();

  // Your chosen default image:
  const DEFAULT_CARD_SRC = "/Hero/11.png"; // must live in /public/Hero/11.png
  // Optional override via ?card=/uploads/whatever.png
  const cardImageParam = searchParams.get("card") || "";
  const cardSrc = cardImageParam || DEFAULT_CARD_SRC;

  const items = [
    { icon: <CreditCard size={18} />, title: "Instant Virtual & Physical", body: "Spin up virtual cards, ship premium metal. Apple/Google Pay ready." },
    { icon: <ShieldCheck size={18} />, title: "Granular Controls", body: "Per-merchant locks, country limits, spend caps, ATM toggles." },
    { icon: <QrCode size={18} />, title: "Scan to Pay", body: "QR & NFC flows with haptics and one-tap confirmations." },
    { icon: <ArrowRightLeft size={18} />, title: "Swap & Settle", body: "Multi-currency wallets, mid-market FX, fee-free between users." },
    { icon: <Eye size={18} />, title: "Privacy Mode", body: "Mask PAN, single-use numbers, burner cards that auto-expire." },
  ];

  return (
    <main className="min-h-svh bg-[#0B0F14] text-[#E6EEF7] selection:bg-cyan-500/20">
      <NavBrand />

      {/* ====== HERO — split layout (left copy, right card mock) ====== */}
      <section className="relative">
        {/* background motifs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px_800px_at_12%_0%,#0A1422_0%,rgba(10,20,34,0)_60%),radial-gradient(900px_700px_at_90%_0%,rgba(0,224,255,.14)_0%,rgba(0,224,255,0)_55%),linear-gradient(180deg,#080C12_0%,#0C111A_100%)",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_15%,transparent,rgba(0,0,0,.45))]" />
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-10 pt-10 md:flex-row md:items-center md:gap-10">
          {/* Left: headline glass */}
          <motion.div {...fadeUp(0)} className="relative w-full md:w-[56%]">
            <div className="rounded-2xl bg-white/[.08] p-6 ring-1 ring-white/15 backdrop-blur-xl md:p-7">
              <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">
                Cards & Controls
              </h1>
              <p className="mt-2 text-sm text-white/80 md:text-base">
                Powerful cards with surgical controls. Freeze, limit, and glow
                with confidence.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/create-account"
                  className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#00E0FF,#00B4D8)] px-4 py-2 font-medium text-[#0B0F14] shadow-[0_10px_30px_rgba(0,212,255,.45)] transition hover:scale-[1.02] active:scale-95"
                >
                  Get a card
                </Link>
                <Link
                  href="/create-account"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 transition hover:bg-white/10"
                >
                  See controls
                </Link>
              </div>
            </div>

            {/* Stats under headline on mobile */}
            <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3 md:hidden">
              <StatChip>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#33D69F]" />
                99.995% card network uptime
              </StatChip>
              <StatChip>
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#00E0FF]" />
                2,000,000+ active cardholders
              </StatChip>
              <StatChip>
                <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_12px_#9B5CFF]" />
                10+ currencies available
              </StatChip>
            </div>
          </motion.div>

          {/* Right: hero visual (card mock with ambient glows) */}
          <motion.div {...fadeUp(0.08)} className="relative w-full md:w-[44%]">
            <div className="relative overflow-hidden rounded-2xl bg-white/[.06] p-6 ring-1 ring-white/12 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,.45)]">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] opacity-80"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,224,255,.9), rgba(155,92,255,.6))",
                }}
              />

              {!prefersReduced && (
                <>
                  <div
                    aria-hidden
                    className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full blur-3xl opacity-30"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(0,224,255,.30), transparent 60%)",
                    }}
                  />
                  <div
                    aria-hidden
                    className="absolute -left-24 -top-16 h-72 w-72 rounded-full blur-3xl opacity-20"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(155,92,255,.30), transparent 60%)",
                    }}
                  />
                </>
              )}

              {/* Card mock */}
              <div className="mx-auto max-w-md">
                <div className="relative h-56 rounded-2xl bg-gradient-to-br from-[#00B4D8] to-[#00E0FF] p-[2px] shadow-[0_16px_60px_rgba(0,212,255,.25)]">
                  <div className="relative h-full overflow-hidden rounded-[14px] bg-[#0F1622] ring-1 ring-white/10">
                    {/* Your image (default) or ?card= override */}
                    <Image
                      src={cardSrc}
                      alt="Card artwork"
                      fill
                      sizes="(max-width: 768px) 90vw, 420px"
                      className="object-cover"
                      onError={hideOnError}
                      priority={false}
                    />
                    {/* soft vignette for depth even with image */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 55%), radial-gradient(120% 100% at 50% 120%, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 60%)",
                      }}
                    />
                  </div>
                </div>

                {/* Chips */}
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5">
                    <Lock size={14} /> Region locks
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5">
                    <Globe2 size={14} /> Multi-currency
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5">
                    <SmartphoneNfc size={14} /> NFC + QR
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats row on desktop */}
        <motion.div
          {...fadeUp(0.12)}
          className="mx-auto hidden max-w-6xl grid-cols-3 gap-3 px-6 pb-4 text-xs md:grid"
        >
          <StatChip>
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#33D69F]" />
            99.995% card network uptime
          </StatChip>
          <StatChip>
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#00E0FF]" />
            2,000,000+ active cardholders
          </StatChip>
          <StatChip>
            <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_12px_#9B5CFF]" />
            10+ currencies available
          </StatChip>
        </motion.div>
      </section>

      {/* ====== BODY — Features → Security → Single 4-image gallery ====== */}
      <section className="relative mx-auto max-w-6xl px-6 pb-12">
        {/* Feature tiles first */}
        <motion.div
          {...fadeUp(0.16)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((x, i) => (
            <motion.div
              key={x.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: easeOut }}
              className={
                "group transform-gpu rounded-2xl bg-[#101826]/80 p-5 ring-1 ring-white/12 backdrop-blur-xl transition-all hover:-translate-y-[1px] hover:shadow-[0_14px_40px_rgba(0,0,0,.45)] " +
                (i === 0 ? "lg:col-span-2" : "")
              }
            >
              <div className="flex items-center gap-3 text-white/90">
                <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                  {x.icon}
                </div>
                <h3 className="font-medium tracking-[-0.01em]">{x.title}</h3>
              </div>
              <p className="mt-2 text-sm text-[#9BB0C6]">{x.body}</p>
              <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="mt-3 text-[12px] text-white/60 transition group-hover:text-white/70">
                Learn more →
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Security banner */}
        <motion.div
          {...fadeUp(0.22)}
          className="relative mt-8 overflow-hidden rounded-2xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-2xl"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[2px] opacity-80"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,224,255,.9), rgba(155,92,255,.6))",
            }}
          />
          <div className="relative flex flex-col items-start gap-4 px-6 py-6 md:flex-row md:items-center md:px-8 md:py-7">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-white/8 ring-1 ring-white/12">
                <ShieldCheck size={18} />
              </span>
              <div>
                <div className="font-medium tracking-[-0.01em]">Security built-in</div>
                <div className="text-xs text-white/70">
                  256-bit TLS • biometric sign-in • device binding • instant fraud alerts
                </div>
              </div>
            </div>
            <div className="md:ml-auto text-xs text-white/80">
              Issued on Visa & Mastercard • Apple Pay & Google Pay supported
            </div>
          </div>
        </motion.div>

        {/* Single compact gallery — exactly 4 images */}
        <motion.div {...fadeUp(0.28)} className="relative mt-8">
          <div className="pointer-events-none absolute -top-8 left-1/2 h-24 w-[80%] max-w-3xl -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 opacity-30 blur-3xl" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { src: "/Hero/cards-showcase3.png", alt: "Angled metal card" },
              { src: "/Hero/card.png", alt: "Card blueprint grid" },
              { src: "/Hero/cardd.jpg", alt: "Stack of dark cards" },
              { src: "/Hero/carddd.jpg", alt: "Contactless glow" },
            ].map((g, idx) => (
              <div
                key={g.alt}
                className={
                  "relative overflow-hidden rounded-xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-xl " +
                  (idx % 3 === 0 ? "h-40" : "h-32")
                }
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width:768px) 50vw, 25vw"
                  className="select-none object-cover opacity-95"
                  draggable={false}
                  onError={hideOnError}
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg,transparent 0%,rgba(0,0,0,.25) 100%)",
                  }}
                />
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Uses global footer from layout */}
    </main>
  );
}
