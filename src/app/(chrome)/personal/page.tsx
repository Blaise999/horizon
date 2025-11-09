// app/personal/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Smartphone,
  ArrowRightLeft,
  Sparkles,
  Globe2,
  Clock3,
  CheckCircle2,
} from "lucide-react";

import PictureSlot from "@/libs/PictureSlot";
import { PATHS } from "@/config/routes";
import { dur, ease, travel, elev } from "@/libs/motion";
// app/layout.tsx (or any page)
import AppFooter from "@/components/Appfooter";
import NavBrand from "@/components/Navbrand";
// ...



/** ──────────────────────────────────────────────────────────────────────────
 *  Small helpers (count-up, chip, focus ring)
 *  ──────────────────────────────────────────────────────────────────────────
 */
function useCountUp(target: number, ms = 1000) {
  const r = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (r) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      // ease-cosine
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * k);
      setV(target * eased);
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, r]);
  return v;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const r = useReducedMotion();
  return (
    <button
      onClick={onClick}
      aria-pressed={!!active}
      className={`px-3.5 py-2 rounded-xl text-sm border transition-all ${
        active
          ? "bg-white/15 border-white/20"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60`}
    >
      <motion.span
        initial={false}
        animate={active && !r ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ duration: dur.ui, ease: ease.outQuint }}
      >
        {children}
      </motion.span>
    </button>
  );
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Page
 *  ──────────────────────────────────────────────────────────────────────────
 */
<NavBrand />
export default function Page() {
  const r = useReducedMotion();

  const card = {
    initial: { y: r ? 0 : travel.md, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: dur.surface, ease: ease.outQuint },
    },
    whileHover: {
      y: r ? 0 : -2,
      transition: { duration: dur.ui, ease: ease.outQuint },
    },
    whileTap: { scale: r ? 1 : 0.98 },
  };

  /** Tabs / filters for micro-interactions */
  const tabs = ["Overview", "Payments", "Cards", "Insights"] as const;
  type Tab = typeof tabs[number];
  const [tab, setTab] = useState<Tab>("Overview");

  /** Count-ups for stat tiles */
  const statUsers = useCountUp(2_000_000, 1050);
  const statSpeed = useCountUp(0.2, 1000);
  const statCurrencies = useCountUp(10, 900);

  /** content for tab section */
  const tabItems = useMemo(() => {
    switch (tab) {
      case "Payments":
        return [
          { t: "Instant transfer", d: "Smart-routed domestic payments land in ~0.2 s." },
          { t: "Split bills", d: "Share a link — settle instantly with friends." },
          { t: "QR pay", d: "Tap, scan, done. Keep receipts tidy." },
        ];
      case "Cards":
        return [
          { t: "Virtual cards", d: "Single-use for subscriptions & trials." },
          { t: "Spending limits", d: "Per-merchant rules that make sense." },
          { t: "Freeze in one tap", d: "Instant protection if your card is lost." },
        ];
      case "Insights":
        return [
          { t: "Clean charts", d: "Clarity on spend without the noise." },
          { t: "Auto-labeling", d: "Vendors grouped intelligently." },
          { t: "Smart nudges", d: "Tiny tips that actually help." },
        ];
      default:
        return [
          { t: "One clean account", d: "Everything working together — not stitched." },
          { t: "Secure by default", d: "Biometrics, 2FA, real-time alerts." },
          { t: "Global ready", d: "Hold 10+ currencies; convert with clarity." },
        ];
    }
  }, [tab]);

  return (
    <div className="min-h-svh bg-[#0B0F14] text-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="container-x py-14 md:py-18">
        <motion.div
          initial={{ opacity: 0, y: r ? 0 : travel.md }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: dur.surface, ease: ease.outQuint },
          }}
          className="rounded-3xl border border-white/10 bg-white/[.06] backdrop-blur-xl p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-sm text-white/70 mb-1">Personal</div>
              <h1 className="text-3xl md:text-4xl font-semibold">
                Money that moves with you
              </h1>
              <p className="mt-2 text-white/70 max-w-xl">
                Spend, save, and manage life’s payments with instant controls and clear insights.
              </p>

              {/* CTA row */}
              <div className="mt-5 flex gap-3">
                <Link
                  href={PATHS.CREATE_ACCOUNT}
                  className="focus:outline-none rounded-xl px-5 py-3 bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-[#0B0F14] font-medium
                             ring-2 ring-[#00E0FF]/0 focus:ring-[#00E0FF]/60 border border-white/10"
                >
                  Open account <ArrowRight className="inline -mt-0.5 ml-1 h-4 w-4" />
                </Link>
                <Link
                  href={PATHS.CREATE_ACCOUNT}
                  className="rounded-xl px-4 py-3 border border-white/15 hover:bg-white/10"
                >
                </Link>
              </div>

              {/* Stats (count-ups) */}
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-md text-center">
                <Stat label="Users" value={Math.round(statUsers).toLocaleString()} />
                <Stat label="Transfer time" value={`${statSpeed.toFixed(1)}s`} />
                <Stat label="Currencies" value={`${Math.round(statCurrencies)}`} />
              </div>
            </div>

            {/* Picture grid (slots) */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-[560px]">
              <PictureSlot
                label="Home feed"
                src="/Hero/home-feed.jpg"
                alt="Horizon personal app home feed"
                aspect="16/10"
                href={PATHS.CREATE_ACCOUNT}
              />
              <PictureSlot
                label="Spend insights"
                src="/Hero/insightss.jpg"
                alt="Spending insights charts and categories"
                aspect="4/3"
                href={PATHS.CREATE_ACCOUNT}
              />
              <PictureSlot
                label="Cards"
                src="/Hero/cards.jpg"
                alt="Card controls and virtual cards"
                aspect="1/1"
                href={PATHS.CREATE_ACCOUNT}
              />
              <PictureSlot
                label="Transfers"
                src="/Hero/transfers.jpg"
                alt="Fast transfers interface"
                aspect="16/10"
                href={PATHS.CREATE_ACCOUNT}
              />
              {/* extra slots */}
              <PictureSlot
                label="Notifications"
                src="/Hero/notifications.jpg"
                alt="Notifications and alerts"
                aspect="3/4"
                href={PATHS.CREATE_ACCOUNT}
              />
              <PictureSlot
                label="Profile"
                src="/Hero/profile.jpg"
                alt="Profile and security"
                aspect="16/10"
                href={PATHS.CREATE_ACCOUNT}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Feature Cards ────────────────────────────────────────────────── */}
      <section className="container-x grid md:grid-cols-3 gap-4">
        {[
          {
            icon: <ShieldCheck />,
            title: "Security first",
            body: "Biometric sign-in, instant freeze, and real-time alerts.",
          },
          {
            icon: <Smartphone />,
            title: "Control in one tap",
            body: "Limits, categories, and virtual cards in seconds.",
          },
          {
            icon: <ArrowRightLeft />,
            title: "Lightning payments",
            body: "Smart-routed domestic payments that land in ~0.2 s.",
          },
        ].map((f, i) => (
          <motion.button
            key={i}
            className={`text-left rounded-2xl border border-white/10 bg-white/[.06] p-5 ${elev[1]}`}
            {...card}
            onClick={() => (window.location.href = PATHS.CREATE_ACCOUNT)}
          >
            <div className="opacity-80">{f.icon}</div>
            <div className="mt-3 font-medium">{f.title}</div>
            <div className="text-sm text-white/70">{f.body}</div>
          </motion.button>
        ))}
      </section>

      {/* ── Media wall (more picture spaces) ─────────────────────────────── */}
      <section className="container-x mt-8 grid md:grid-cols-4 gap-3">
        <PictureSlot
          label="Bill split"
          src="/Hero/bill-split.jpg"
          alt="Split a bill with friends"
          aspect="16/10"
          href={PATHS.CREATE_ACCOUNT}
        />
        <PictureSlot
          label="FX convert"
          src="/Hero/fx.jpg"
          alt="Convert currencies at clear rates"
          aspect="16/10"
          href={PATHS.CREATE_ACCOUNT}
        />
        <PictureSlot
          label="Budget board"
          src="/Hero/budget.jpg"
          alt="Monthly budget board"
          aspect="16/10"
          href={PATHS.CREATE_ACCOUNT}
        />
        <PictureSlot
          label="Receipts"
          src="/Hero/receipts.jpg"
          alt="Receipts vault"
          aspect="16/10"
          href={PATHS.CREATE_ACCOUNT}
        />
      </section>

      {/* ── Interactive Tabs (chips) ─────────────────────────────────────── */}
      <section className="container-x mt-12">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="opacity-80" />
            <h2 className="text-xl font-semibold">Explore the experience</h2>
          </div>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-5 grid lg:grid-cols-[1.2fr_.8fr] gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: r ? 0 : 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: dur.ui, ease: ease.outQuint } }}
                exit={{ opacity: 0, y: r ? 0 : -6, transition: { duration: dur.ui, ease: ease.inQuint } }}
                className="grid sm:grid-cols-2 gap-3"
              >
                {tabItems.map((x) => (
                  <motion.button
                    key={x.t}
                    className={`text-left rounded-xl border border-white/10 bg-white/[.04] p-4 ${elev[0]}`}
                    whileHover={{ y: r ? 0 : -2 }}
                    whileTap={{ scale: r ? 1 : 0.98 }}
                    onClick={() => (window.location.href = PATHS.CREATE_ACCOUNT)}
                  >
                    <div className="font-medium">{x.t}</div>
                    <div className="text-sm text-white/70">{x.d}</div>
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tall picture column with more slots */}
          <div className="grid grid-cols-1 gap-3">
            <PictureSlot
              label={`${tab} preview`}
              src="/Hero/preview.jpg"
              alt="Current section preview"
              aspect="16/10"
              href={PATHS.CREATE_ACCOUNT}
            />
            <PictureSlot
              label="Detail"
              src="/Hero/detail.jpg"
              alt="Detail screen"
              aspect="4/3"
              href={PATHS.CREATE_ACCOUNT}
            />
            <PictureSlot
              label="Settings"
              src="/Hero/settings.jpg"
              alt="Settings controls"
              aspect="3/4"
              href={PATHS.CREATE_ACCOUNT}
            />
          </div>
        </div>
      </section>

      {/* ── Guarantees / Reassurance row ─────────────────────────────────── */}
      <section className="container-x mt-12 grid md:grid-cols-3 gap-4">
        {[
          { icon: <Globe2 />, t: "Global ready", d: "Hold, receive, and convert with clarity." },
          { icon: <Clock3 />, t: "Always on", d: "99.995% uptime — your money doesn’t nap." },
          { icon: <CheckCircle2 />, t: "FDIC-backed partners", d: "Security that’s real, not vibe." },
        ].map((g, i) => (
          <motion.div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/[.06] p-5"
            initial={{ opacity: 0, y: r ? 0 : travel.sm }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: dur.ui, ease: ease.outQuint } }}
            viewport={{ once: true, amount: 0.35 }}
          >
            <div className="opacity-80">{g.icon}</div>
            <div className="mt-2 font-medium">{g.t}</div>
            <div className="text-sm text-white/70">{g.d}</div>
          </motion.div>
        ))}
      </section>

      {/* ── Final CTA banner ─────────────────────────────────────────────── */}
      <section className="container-x my-14">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#00E0FF]/15 to-[#9B5CFF]/15 p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold">Ready when you are</h3>
              <p className="text-white/70">
                Open in 2 minutes. You can undo sensitive actions for 5 seconds.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={PATHS.CREATE_ACCOUNT}
                className="rounded-xl px-5 py-3 bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-[#0B0F14] font-medium"
              >
                Create account
              </Link>
              <Link
                href={PATHS.CREATE_ACCOUNT}
                className="rounded-xl px-4 py-3 border border-white/15 hover:bg-white/10"
              >
                Explore features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Small stat tile with subtle shine + focus ring
 *  ──────────────────────────────────────────────────────────────────────────
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.06] p-3 relative overflow-hidden">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-lg font-semibold mt-0.5 tabular-nums">{value}</div>
      <div
        className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(120% 60% at 0% 0%, rgba(0,224,255,.09), transparent)",
        }}
      />
    </div>
  );
}

<AppFooter />
