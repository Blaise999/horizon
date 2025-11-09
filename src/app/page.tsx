"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// ✅ the ONLY header you import and render
import Nav from "@/components/head";

import BalanceCard from "@/components/BalanceCard";
import FeatureCardUltra from "@/components/FeatureCard";
import TrustStrip from "@/components/TrustStrip";
import Testimonials from "@/components/Testimonials";
import SupportDock from "@/components/SupportDock";
// ⛔️ removed FigureCallout import (we no longer use it)
// import FigureCallout from "@/components/FigureCallout";
import { PATHS } from "@/config/routes";

import {
  ArrowRight,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Zap,
  Globe2,
  Plus,
  ArrowRightLeft,
  QrCode,
  Upload,
  Wallet,
  LineChart,
  Globe,
  ChevronDown,
  CheckCircle2,
  Twitter,
  Github,
  Linkedin,
  Youtube,
} from "lucide-react";

import FeatureSectionPro from "@/components/motion/FeatureSection";
import OverlayHero, { type OverlaySlide } from "@/components/motion/OverlayHero";
import FeatureCarouselPro from "@/components/FeatureCarouselPro";
import StickyWhyMobile from "@/components/StickyWhyMobile";
import ZigZagRow from "@/components/zigzagrow";

/* ──────────────────────────────────────────────────────────
   SAFE PATH RESOLVER (uses PATHS if present, else fallback)
────────────────────────────────────────────────────────── */
const P = (key: string, fallback: string) =>
  (PATHS as unknown as Record<string, string>)?.[key] ?? fallback;

/* ──────────────────────────────────────────────────────────
   BACKGROUND FX
────────────────────────────────────────────────────────── */
function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-50">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1400px 1000px at 20% -10%, #0A1422 0%, rgba(10,20,34,0) 60%), radial-gradient(1200px 900px at 90% 10%, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0) 50%), linear-gradient(180deg, #080C12 0%, #0C111A 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_20%,transparent,rgba(0,0,0,.45))]" />
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   FLOATING ICON
────────────────────────────────────────────────────────── */
function FloatingIcon({
  children,
  className = "",
  delay = 0,
  distance = 12,
  duration = 6.5,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  duration?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className={`absolute text-white/20 ${className}`}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: [0, -distance, 0], opacity: [0, 1, 1] }}
      transition={{ duration, ease: "easeInOut", repeat: Infinity, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────
   PROGRESS RING
────────────────────────────────────────────────────────── */
function ProgressRing({
  size = 40,
  stroke = 6,
  value = 0.42,
}: {
  size?: number;
  stroke?: number;
  value?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamp = Math.max(0, Math.min(1, value));
  const dash = clamp * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block shadow-[0_0_8px_rgba(0,224,255,0.4)]"
      aria-label={`Progress ${Math.round(clamp * 100)}%`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.15)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#vault-grad)"
        strokeLinecap="round"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="vault-grad" x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="#00E0FF" />
          <stop offset="1" stopColor="#9B5CFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────
   QUICK ACTIONS (now link out)
────────────────────────────────────────────────────────── */
function QuickActions() {
  const Chip = ({ href, icon, label }: { href: string; icon: ReactNode; label: string }) => (
    <Link
      href={href}
      className="shrink-0 snap-start px-4 py-3 rounded-xl bg-white/[.08] hover:bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-white/12 text-sm inline-flex items-center gap-2 transition-all hover:scale-105"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );

  const toCreate = P("CREATE_ACCOUNT", "/create-account");

  return (
    <div
      className="mt-4 overflow-x-auto px-3 [scrollbar-width:none] [-ms-overflow-style:none]"
      style={{
        paddingLeft: "calc(env(safe-area-inset-left,0px) + 12px)",
        paddingRight: "calc(env(safe-area-inset-right,0px) + 12px)",
        scrollSnapType: "x mandatory",
        scrollPaddingInline: 12,
      }}
    >
      <div className="flex gap-2">
        <Chip href={toCreate} icon={<Plus size={16} />} label="Add money" />
        <Chip href={toCreate} icon={<ArrowRightLeft size={16} />} label="Transfer" />
        <Chip href={toCreate} icon={<QrCode size={16} />} label="Pay QR" />
        <Chip href={toCreate} icon={<Upload size={16} />} label="Top-up" />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   FX TICKER
────────────────────────────────────────────────────────── */
function FxTicker() {
  const [v, setV] = useState(0.01);
  useEffect(() => {
    const id = setInterval(() => {
      setV((p) => {
        const next = p + (Math.random() - 0.5) * 0.01;
        return Math.max(-0.04, Math.min(0.04, +next.toFixed(2)));
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  const up = v >= 0;

  return (
    <div className="flex items-center gap-2 text-xs" aria-live="polite">
      <span
        className={`h-2 w-2 rounded-full ${up ? "bg-emerald-500 shadow-[0_0_8px_emerald-400]" : "bg-rose-500 shadow-[0_0_8px_rose-400]"} animate-pulse`}
        aria-hidden
      />
      <span className="text-white/70">Mid-market drift</span>
      <span className={`num ${up ? "text-emerald-500" : "text-rose-500"}`}>{up ? "+" : ""}{v.toFixed(2)}%</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   UI HELPERS
────────────────────────────────────────────────────────── */
const GlassPanel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`relative rounded-2xl p-6 md:p-7 bg-white/6 backdrop-blur-2xl ring-1 ring-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${className}`}>
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[inherit] opacity-80"
      style={{ background: "linear-gradient(90deg, rgba(0,224,255,.9), rgba(155,92,255,.6))" }}
    />
    <span className="pointer-events-none absolute inset-[1px] rounded-[calc(theme(borderRadius.2xl)-1px)] [background:linear-gradient(90deg,#00D4FF77,#00E0FF44)] opacity-70" />
    <div className="relative">{children}</div>
  </div>
);

const Primary = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium bg-[linear-gradient(180deg,#00D4FF,#00B4D8)] text-[#0B0F14] shadow-[0_10px_30px_rgba(0,212,255,.45)] hover:scale-[1.02] active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-[#00E0FF]/50 transition-all"
  >
    {children}
  </button>
);

const Ghost = ({ children, href = "#" }: { children: ReactNode; href?: string }) => (
  <Link
    href={href}
    className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border border-white/20 text-white/95 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
  >
    {children}
  </Link>
);

/* ──────────────────────────────────────────────────────────
   STAIR ITEM
────────────────────────────────────────────────────────── */
const StairItem = ({
  step,
  children,
  className = "",
}: {
  step: 0 | 1 | 2;
  children: ReactNode;
  className?: string;
}) => {
  const offsets = step === 0 ? "ml-0 translate-y-0" : step === 1 ? "ml-3 -mt-6" : "ml-6 -mt-6";
  const z = step === 0 ? "z-30" : step === 1 ? "z-20" : "z-10";
  const delay = step === 2 ? 0 : step === 1 ? 0.15 : 0.3;
  const shadow =
    step === 0
      ? "shadow-[0_14px_45px_rgba(0,0,0,.5)]"
      : step === 1
      ? "shadow-[0_12px_35px_rgba(0,0,0,.42)]"
      : "shadow-[0_10px_28px_rgba(0,0,0,.35)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      className={`relative ${offsets} ${z} ${shadow} md:ml-0 md:mt-0 md:translate-y-0 ${className}`}
    >
      <span className="md:hidden pointer-events-none absolute left-0 top-2 bottom-4 w-px bg-white/12" />
      {children}
    </motion.div>
  );
};

/* ──────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────── */
export default function Page() {
  const router = useRouter();

  const slides: OverlaySlide[] = [
    {
      id: "security",
      backdrop: "/Hero/slide1.jpg",
      eyebrow: "Banking • Secure",
      title: "Your money, guarded and growing.",
      body: "Open in 2 minutes. 256-bit TLS, biometric sign-in, instant fraud alerts. Earn while your balance rests.",
      cta: { label: "Get started", href: P("CREATE_ACCOUNT", "/create-account") },
      align: "left",
    },
    {
      id: "cards",
      backdrop: "/Hero/slide2.jpg",
      eyebrow: "Cards & Payments",
      title: "One card for life on the move.",
      body: "Tap to pay, create virtual cards for subs, freeze in one tap. Split bills that settle instantly.",
      cta: { label: "Get your card", href: P("CREATE_ACCOUNT", "/create-account") },
      align: "right",
    },
    {
      id: "global",
      backdrop: "/Hero/slide3.jpg",
      eyebrow: "Multi-currency • FX",
      title: "Go global without the hidden fees.",
      body: "Hold 10+ currencies, receive like a local, convert at great rates—straight from your balance card.",
      cta: { label: "Open multi-currency", href: P("INTERNATIONAL", P("CREATE_ACCOUNT", "/create-account")) },
      align: "center",
    },
  ];

  const heroRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const goCreate = () => router.push(P("CREATE_ACCOUNT", "/create-account"));

  return (
    <div className="bg-[#0B0F14] text-white">
      {/* ✅ the ONLY header on this page */}
      <Nav />

      {/* push content below fixed header (84px mobile / 64px md+) */}
      <div className="pt-[84px] md:pt-[64px]">
        <BackgroundFX />

        {/* floaters */}
        <FloatingIcon className="left-4 top-28 hidden md:block" delay={0.4} distance={16} duration={7}>
          <ShieldCheck size={32} />
        </FloatingIcon>
        <FloatingIcon className="right-6 top-40 hidden lg:block" delay={0.9} distance={20} duration={8}>
          <CreditCard size={34} />
        </FloatingIcon>
        <FloatingIcon className="left-10 top-[60vh] hidden md:block" delay={0.2} distance={18} duration={7.5}>
          <LineChart size={32} />
        </FloatingIcon>
        <FloatingIcon className="right-10 top-[68vh] hidden xl:block" delay={1.2} distance={22} duration={9}>
          <Globe2 size={34} />
        </FloatingIcon>
        <FloatingIcon className="left-20 top-16 hidden lg:block" delay={0.6} distance={14} duration={6}>
          <Zap size={30} />
        </FloatingIcon>
        <FloatingIcon className="right-20 bottom-20 hidden md:block" delay={1.0} distance={16} duration={7}>
          <Wallet size={32} />
        </FloatingIcon>

        {/* === Overlay Hero === */}
        <div
          ref={heroRef}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative"
        >
          <OverlayHero slides={slides} autoMs={6500} />

          {/* micro trust bar under hero */}
          <div className="container-x -mt-6 md:-mt-8">
            <div className="rounded-xl border border-white/12 bg-white/6 backdrop-blur-xl px-4 py-3 text-[13px] grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> 2-factor & biometric
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> 99.995% uptime
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Visa • MC • Apple Pay
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Globe2 className="h-4 w-4" /> 10+ currencies
              </div>
            </div>
          </div>
        </div>

        {/* === Feature: Core Banking Capabilities (refined, no figure) === */}
        <FeatureSectionPro
          id="features"
          eyebrow="Discover"
          title="Core Banking Capabilities"
          subtitle="Cards, payments, savings and insights — engineered to work as one."
          center
          childrenClassName="overflow-visible"
        >
          <div className="relative mx-auto max-w-[1120px]">
            {/* ambient corner glows */}
            <div
              aria-hidden
              className="pointer-events-none absolute -z-10 -top-6 left-0 h-40 w-40 rounded-full blur-[42px] opacity-30"
              style={{ background: "radial-gradient(closest-side, rgba(0,224,255,.35), transparent 70%)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -z-10 -top-4 right-4 h-32 w-32 rounded-full blur-[38px] opacity-25"
              style={{ background: "radial-gradient(closest-side, rgba(155,92,255,.35), transparent 70%)" }}
            />

            {/* chip rail */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {[
                ["Transfers", true],
                ["Cards", false],
                ["Insights", false],
                ["Vaults", false],
              ].map(([label, active]) => (
                <span
                  key={label as string}
                  className={[
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] border transition",
                    active
                      ? "border-white/25 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,.22),0_0_24px_rgba(0,224,255,.18)]"
                      : "border-white/15 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  {label as string}
                </span>
              ))}
            </div>

            {/* framed carousel (glass + gradient hairline) */}
            <div className="relative rounded-2xl ring-1 ring-white/12 bg-white/5 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,.45)] overflow-hidden">
              {/* gradient top hairline */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] opacity-80"
                style={{ background: "linear-gradient(90deg, rgba(0,224,255,.9), rgba(155,92,255,.6))" }}
              />
              {/* subtle grid texture */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[.18] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  maskImage:
                    "radial-gradient(80% 70% at 50% 40%, #000 60%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(80% 70% at 50% 40%, #000 60%, transparent 100%)",
                }}
              />
              {/* ambient halo */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, rgba(0,224,255,.28), transparent 60%)" }}
              />
              {/* content */}
              <div className="p-2 sm:p-3 md:p-4">
                <div className="flex justify-center">
                  <div className="w-full max-w-[980px]">
                    <FeatureCarouselPro />
                  </div>
                </div>
              </div>

              {/* caption / status bar */}
              <div className="border-t border-white/10 bg-white/[.04] backdrop-blur-xl px-3 sm:px-4 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-white/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Instant transfers (median 0.2s)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-white/65">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Virtual cards • Limits • Freeze
                    </span>
                  </div>
                  <Link
                    href={P("CREATE_ACCOUNT", "/create-account")}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium bg-[linear-gradient(180deg,#00E0FF,#00B4D8)] text-[#0B0F14] shadow-[0_10px_28px_rgba(0,212,255,.38)] hover:scale-[1.02] active:scale-[.98] transition-all"
                  >
                    Get started <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* micro trust strip under the frame */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 backdrop-blur md:justify-center">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_#33D69F]" />
                99.995% uptime
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 backdrop-blur md:justify-center">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_14px_#00E0FF]" />
                2,000,000+ users
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-2 backdrop-blur md:justify-center">
                <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_14px_#9B5CFF]" />
                10+ currencies
              </div>
            </div>
          </div>
        </FeatureSectionPro>

        {/* === WHY HORIZON === */}
        <FeatureSectionPro
          id="why"
          eyebrow="Why Horizon"
          title="Everything you need — without the noise"
          subtitle="Fast onboarding, clean controls, and helpful automation."
          childrenClassName="overflow-visible"
        >
          <StickyWhyMobile />
          <div className="mt-6">
            <ZigZagRow
              items={[
                <div key="1">
                  <h4 className="font-medium">
                    <Link href={P("CREATE_ACCOUNT", "/create-account")} className="hover:underline">
                      Instant transfers
                    </Link>
                  </h4>
                  <p className="text-white/70 text-sm mt-1">Smart-routed domestic payments land in ~0.2 s.</p>
                </div>,
                <div key="2">
                  <h4 className="font-medium">
                    <Link href={P("SAVINGS", "/create-account")} className="hover:underline">
                      Smart vaults
                    </Link>
                  </h4>
                  <p className="text-white/70 text-sm mt-1">Round-ups, salary skim, and targets with progress rings.</p>
                </div>,
                <div key="3">
                  <h4 className="font-medium">
                    <Link href={P("INTERNATIONAL", "/create-account")} className="hover:underline">
                      Transparent FX
                    </Link>
                  </h4>
                  <p className="text-white/70 text-sm mt-1">Live rate and fee shown upfront. No surprises.</p>
                </div>,
              ]}
            />
          </div>

          <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-visible mt-10">
            <StairItem step={0}>
              <FeatureCardUltra
                icon={<ArrowRight size={20} />}
                title="Instant transfers"
                body="Smart-routed domestic payments land in ~0.2 s."
                demo="demo> transfer --speed .2s"
                effect="beam"
                href={P("CREATE_ACCOUNT", "/create-account")}
              />
            </StairItem>
            <StairItem step={1}>
              <FeatureCardUltra
                icon={<CreditCard size={20} />}
                title="Cards that obey"
                body="Freeze, set limits, and one-time virtual cards for subs."
                demo="card.freeze() // done"
                effect="freeze"
                href={P("CARDS", "/cards")}
              />
            </StairItem>
            <StairItem step={2}>
              <FeatureCardUltra
                icon={<BarChart3 size={20} />}
                title="Clarity on spend"
                body="Live insights with clean, explorable charts."
                demo="insights.open('spend')"
                effect="chart"
                href={P("INSIGHTS", "/create-account")}
              />
            </StairItem>
          </div>
        </FeatureSectionPro>

        {/* === Balance + FX Demo === */}
        <section id="fx" className="container-x section-pad grid lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4 max-w-[520px] md:max-w-none mx-auto w-full">
            <div className="px-1 sm:px-0">
              <div className="[&_.balance-lead]:leading-[1.15] [&_.balance-lead]:text-[26px] xs:[&_.balance-lead]:text-[28px]">
                <BalanceCard />
              </div>
            </div>
            <QuickActions />
            <GlassPanel>
              <div className="flex items-center justify-between">
                <div className="text-[18px] font-medium">
                  <Link href={P("SAVINGS", "/create-account")} className="hover:underline">
                    Smart Vault
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressRing value={0.42} />
                  <span className="text-xs text-white/70">42% of goal</span>
                </div>
              </div>
              <div className="mt-2 text-[13px] leading-[1.35] text-white/70">
                Round-ups and salary skim help you hit goals without thinking.
              </div>
              <div className="mt-3">
                <Link href={P("SAVINGS", "/create-account")} className="text-xs text-cyan-300 hover:underline">
                  Learn about Savings & Goals →
                </Link>
              </div>
            </GlassPanel>
          </div>

          <div className="card p-6 md:p-8 relative overflow-hidden">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[inherit] opacity-70"
              style={{ background: "linear-gradient(90deg, rgba(0,224,255,.8), rgba(155,92,255,.5))" }}
            />
            <div className="flex items-center justify-between mb-3">
              <div className="text-[18px] font-medium">
                <Link href={P("INTERNATIONAL", "/create-account")} className="hover:underline">
                  FX converter
                </Link>
              </div>
              <FxTicker />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-3">
                <div className="text-xs text-[var(--c-text-muted)] mb-1">From (USD 🇺🇸)</div>
                <div className="text-[16px] num">$1,000.00</div>
              </div>
              <div className="card p-3">
                <div className="text-xs text-[var(--c-text-muted)] mb-1">To (EUR 🇪🇺)</div>
                <div className="text-[16px] num">€919.40</div>
              </div>
            </div>
            <div className="mt-3 text-xs text=[var(--c-text-muted)]">Mid-market rate ticks ±0.01 every 4 s</div>
            <div className="mt-3">
              <Link href={P("INTERNATIONAL", "/create-account")} className="text-xs text-cyan-300 hover:underline">
                See international transfers →
              </Link>
            </div>
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full blur-3xl opacity-25 bg-cyan-500" />
          </div>
        </section>

        <TrustStrip />
        <Testimonials />

        {/* === CTA === */}
        <section
          id="cta"
          className="container-x section-pad text-center bg-gradient-to-b from-transparent to-white/5 rounded-3xl shadow-[0_20px_60px_rgba(0,224,255,0.15)] p-8"
        >
          <h2 className="text-[28px] md:text-[36px] font-semibold">Join 2 million users redefining money</h2>
          <p className="mt-2 text-[var(--c-text-2)]">Cyan accent. Calm and confident. No clutter.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Primary onClick={goCreate}>
              Get Started <ArrowRight className="h-4 w-4" />
            </Primary>
            {/* Download routes are not in your tree → send to Create Account */}
            <Ghost href={P("CREATE_ACCOUNT", "/create-account")}>Download App</Ghost>
          </div>
        </section>

        {/* === Footer === */}
        <footer className="relative mt-16">
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-32 w-[80%] max-w-5xl rounded-full blur-3xl opacity-30 bg-gradient-to-r from-cyan-500 to-violet-600" />
          <div
            aria-hidden
            className="h-px w-full"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent)",
            }}
          />
          <div className="container-x py-10 md:py-14">
            <div className="grid gap-10 md:gap-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-b from-cyan-500 to-emerald-500" />
                  <span className="font-semibold text-[18px]">Horizon</span>
                </div>
                <p className="mt-3 text-[var(--c-text-2)]">Modern money, beautifully simple.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={P("CREATE_ACCOUNT", "/create-account")} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                    Download on App Store
                  </Link>
                  <Link href={P("CREATE_ACCOUNT", "/create-account")} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                    Get it on Google Play
                  </Link>
                </div>
                <div className="mt-6 flex items-center gap-3 text-white/70">
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="p-2 rounded-lg hover:bg-white/10"><Twitter size={18} /></a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-2 rounded-lg hover:bg-white/10"><Github size={18} /></a>
                  <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="p-2 rounded-lg hover:bg-white/10"><Linkedin size={18} /></a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="p-2 rounded-lg hover:bg-white/10"><Youtube size={18} /></a>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs text-[var(--c-text-2)]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  FDIC-insured partners • 256-bit TLS
                </div>
              </div>

              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-8">
                <FooterCol
                  title="Product"
                  links={[
                    ["Accounts", P("CREATE_ACCOUNT", "/create-account")],
                    ["Cards & Controls", P("CARDS", "/cards")],
                    ["Savings & Goals", P("SAVINGS", "/savings")],
                    ["Invest", P("INVEST", "/invest")],
                  ]}
                />
                <FooterCol
                  title="Company"
                  links={[
                    ["About", P("ABOUT", "/about")],
                    ["Careers", P("CAREERS", "/careers")],
                    ["Press", P("BLOG", "/blog")],
                    ["Security", P("SECURITY", "/security")],
                  ]}
                />
                <FooterCol
                  title="Legal"
                  links={[
                    ["Privacy", P("PRIVACY", "/create-account")],
                    ["Terms", P("TERMS", "/create-account")],
                    ["Licenses", P("LICENSES", "/create-account")],
                    ["Disclosures", P("DISCLOSURES", "/create-account")],
                  ]}
                />
                <FooterCol
                  title="Support"
                  links={[
                    ["Help Center", P("SUPPORT", "/create-account")],
                    ["Status", P("STATUS", "/create-account")],
                    ["Contact", P("CONTACT", "/create-account")],
                    ["Developers", P("CREATE_ACCOUNT", "/create-account")],
                  ]}
                />
              </div>
            </div>

            <div className="mt-10 md:mt-14 flex flex-col gap-4 border-t border-[var(--c-hairline)]/80 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10">
                  <Globe size={16} className="opacity-80" />
                  English (US)
                  <ChevronDown size={14} className="opacity-70" />
                </button>
                <button className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/10">
                  USD
                  <ChevronDown size={14} className="opacity-70" />
                </button>
                <span className="ml-1 text-[var(--c-text-2)] text-sm">
                  Status: <span className="text-emerald-400">All systems normal</span>
                </span>
              </div>

              <div className="text-sm text-[var(--c-text-2)]">
                © {new Date().getFullYear()} Horizon Bank Inc. All rights reserved.
              </div>
            </div>
          </div>
        </footer>

        <SupportDock />
      </div>
    </div>
  );
}

/* helper for footer link columns */
function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-[13px] font-medium tracking-wide text-white/90 mb-2">{title}</div>
      <ul className="space-y-2 text-[14px] text-[var(--c-text-2)]">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
