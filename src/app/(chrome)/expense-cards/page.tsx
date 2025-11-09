// app/crypto/logic/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";
import {
  Bitcoin,
  Layers,
  Zap,
  SlidersHorizontal,
  QrCode,
  Send,
  Shuffle,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  Wallet,
  ArrowRight,
  Timer,
  Network,
  Info,
  Lock,
} from "lucide-react";

/* Motion helpers */
const ease = [0.16, 1, 0.3, 1] as const;
const fade = (d = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: d, ease } },
});

/* -------------------------------------------------------------------------- */
/*                               Page Component                               */
/* -------------------------------------------------------------------------- */
export default function CryptoLogicPage() {
  return (
    <main className="min-h-svh bg-[#0B0F14] text-[#E6EEF7] selection:bg-cyan-500/20">
      <NavBrand />

      {/* Background motif */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 800px at 12% 0%, #0A1422 0%, rgba(10,20,34,0) 60%), radial-gradient(900px 700px at 90% 0%, rgba(0,224,255,.14) 0%, rgba(0,224,255,0) 55%), linear-gradient(180deg,#080C12 0%,#0C111A 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_15%,transparent,rgba(0,0,0,.45))]" />
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        <motion.div {...fade(0)} className="rounded-2xl bg-white/[.08] p-6 ring-1 ring-white/15 backdrop-blur-xl">
          <HeaderHairline />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <h1 className="text-[28px] md:text-[40px] font-semibold tracking-[-0.02em]">Crypto Logic</h1>
            <div className="flex flex-wrap gap-2 text-xs md:ml-auto">
              <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />}>Best practices</Pill>
              <Pill icon={<KeyRound className="h-3.5 w-3.5" />}>Secure flows</Pill>
              <Pill icon={<Network className="h-3.5 w-3.5" />}>Chain-aware</Pill>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-white/80">
            How on-chain transfers work: networks, fees, confirmations, memos/tags, UTXO vs. account chains, approvals, slippage, and safety.
          </p>
          <div className="mt-4 flex gap-2">
            <CTA href="/create-account" primary>Start crypto transfer</CTA>
            <CTA href="/create-account">See a demo</CTA>
          </div>
        </motion.div>
      </section>

      {/* CORE CONCEPTS */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        <motion.div {...fade(0.05)} className="rounded-2xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-2xl p-6">
          <HeaderHairline />
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Network Selection" icon={<Layers className="h-4 w-4" />}>
              <List>
                <Item><b>EVM (ETH/Polygon/BSC):</b> account-based; gas in native coin; ERC-20 approvals.</Item>
                <Item><b>Bitcoin / UTXO:</b> inputs/outputs; fee per vbyte; change outputs &amp; dust rules.</Item>
                <Item><b>Alt rails:</b> TRON (TRC-20), Solana (SPL), etc. <b>Always match token ↔ network</b>.</Item>
              </List>
              <ChipRow chips={["ETH / ERC-20", "BTC / UTXO", "TRON / TRC-20", "SOL / SPL"]} />
            </Card>

            <Card title="Fees & Confirmations" icon={<Zap className="h-4 w-4" />}>
              <List>
                <Item><b>Priority fees:</b> higher fee → faster inclusion during congestion.</Item>
                <Item><b>Confirmations:</b> credit after N blocks based on risk policy.</Item>
                <Item><b>Finality:</b> differs by chain; BTC probabilistic, SOL/other fast finality.</Item>
              </List>
              <BadgeRow badges={["BTC 1–3 conf", "ETH 2–12 conf", "SOL seconds"]} />
            </Card>

            <Card title="Approvals & Slippage" icon={<SlidersHorizontal className="h-4 w-4" />}>
              <List>
                <Item><b>Token approval:</b> one-time ERC-20 allowance for router to spend your token.</Item>
                <Item><b>Slippage:</b> sets min received; protects against price impact/MEV.</Item>
                <Item><b>Nonce & replacements:</b> speed up/replace with same nonce + higher fee.</Item>
              </List>
              <ChipRow chips={["Approval → Swap", "1–2% slippage", "Replace-by-fee"]} />
            </Card>
          </div>
        </motion.div>
      </section>

      {/* SEND / RECEIVE / SWAP */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        <motion.div {...fade(0.08)} className="rounded-2xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-2xl p-6">
          <HeaderHairline />
          <div className="grid gap-4 md:grid-cols-3">
            <Explainer
              icon={<Send className="h-4 w-4" />}
              title="Send"
              bullets={[
                "Paste address or scan QR; verify checksum & correct network.",
                "Pick fee tier (eco / normal / priority).",
                "Broadcast transaction and wait for confirmations.",
              ]}
            />
            <Explainer
              icon={<QrCode className="h-4 w-4" />}
              title="Receive"
              bullets={[
                "Share the correct address for the chosen network.",
                "Some assets (XRP, XLM) require a destination tag/memo.",
                "Never share private keys or seed phrases—address only.",
              ]}
            />
            <Explainer
              icon={<Shuffle className="h-4 w-4" />}
              title="Swap"
              bullets={[
                "If ERC-20, approve once; then sign the swap.",
                "Set slippage to define minimum received.",
                "Gas is paid in the chain’s native coin (e.g., ETH).",
              ]}
            />
          </div>
        </motion.div>
      </section>

      {/* MINI HELPERS: Min Received & Fee Tiers (Client-only) */}
      <section className="mx-auto max-w-7xl px-6 pb-10">
        <motion.div {...fade(0.12)} className="rounded-2xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-2xl p-6">
          <HeaderHairline />
          <div className="grid gap-6 md:grid-cols-[1.1fr_.9fr]">
            <MinReceivedCard />
            <FeeTierCard />
          </div>
          <div className="mt-4 flex gap-2">
            <CTA href="/create-account" primary>Try a test transfer</CTA>
            <CTA href="/create-account">Explore supported networks</CTA>
          </div>
        </motion.div>
      </section>

      {/* SAFETY */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <motion.div {...fade(0.14)} className="rounded-2xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-2xl p-6">
          <HeaderHairline />
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-white/90" />
            <div className="font-medium">Safety notes</div>
          </div>
          <List className="mt-2">
            <Item>Always match <b>asset ↔ network</b> (ERC-20 ≠ TRC-20). Wrong network can burn funds.</Item>
            <Item>If an asset needs a <b>tag/memo</b>, include it. Missing tags may lose funds.</Item>
            <Item>On-chain transfers are <b>final</b> after confirmation—verify addresses carefully.</Item>
            <Item>Keep a small native balance (e.g., ETH) for gas when moving ERC-20 tokens.</Item>
            <Item>Use test amounts for new addresses or first-time routes.</Item>
          </List>
          <div className="mt-4 flex gap-2">
            <CTA href="/create-account">Send a small test</CTA>
            <CTA href="/create-account" primary>Start crypto transfer</CTA>
          </div>
        </motion.div>
      </section>

      <AppFooter />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Local Components                              */
/* -------------------------------------------------------------------------- */

function HeaderHairline() {
  return (
    <span
      aria-hidden
      className="block h-[2px] w-full rounded-full opacity-80 mb-4"
      style={{
        background:
          "linear-gradient(90deg, rgba(0,224,255,.9), rgba(155,92,255,.6))",
      }}
    />
  );
}

function CTA({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  if (primary) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#00E0FF,#00B4D8)] px-4 py-2 font-medium text-[#0B0F14] shadow-[0_10px_30px_rgba(0,212,255,.45)] transition hover:scale-[1.02] active:scale-95"
      >
        {children} <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-white/90 hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#101826]/85 ring-1 ring-white/10 p-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10">
          {icon}
        </div>
        <div className="font-medium">{title}</div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function List({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul className={`text-sm text-[#9BB0C6] list-disc pl-5 space-y-1 ${className}`}>
      {children}
    </ul>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

function Pill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-white/80">
      {icon} {children}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs">
      {children}
    </span>
  );
}

function ChipRow({ chips }: { chips: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((c) => (
        <Chip key={c}>{c}</Chip>
      ))}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

function BadgeRow({ badges }: { badges: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {badges.map((b) => (
        <Badge key={b}>{b}</Badge>
      ))}
    </div>
  );
}

function Explainer({
  icon,
  title,
  bullets,
}: {
  icon: React.ReactNode;
  title: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl bg-[#101826]/85 ring-1 ring-white/10 p-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10">{icon}</div>
        <div className="font-medium">{title}</div>
      </div>
      <ul className="mt-2 text-sm text-[#9BB0C6] list-disc pl-5 space-y-1">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------- Client mini-widgets --------------------------- */

function MinReceivedCard() {
  const [amountIn, setAmountIn] = useState<string>("100");
  const [slippage, setSlippage] = useState<string>("1.0");
  const [fee, setFee] = useState<string>("0.25"); // swap/router fee in %

  const parsedIn = useMemo(() => safeNum(amountIn), [amountIn]);
  const parsedSlip = useMemo(() => safeNum(slippage), [slippage]);
  const parsedFee = useMemo(() => safeNum(fee), [fee]);

  const minOut = useMemo(() => {
    // very simple illustrative math: minOut = amountIn * (1 - fee%) * (1 - slippage%)
    const base = parsedIn * (1 - parsedFee / 100);
    return base * (1 - parsedSlip / 100);
  }, [parsedIn, parsedFee, parsedSlip]);

  return (
    <div className="rounded-2xl bg-[#101826]/90 ring-1 ring-white/10 p-5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4" />
        <div className="font-medium">Min Received (swap slippage)</div>
      </div>
      <p className="mt-1 text-sm text-[#9BB0C6]">
        Illustrative only. Actual execution depends on pool liquidity, price impact, MEV and fees.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field
          label="Amount In"
          value={amountIn}
          onChange={setAmountIn}
          suffix="TOKEN A"
          placeholder="100"
        />
        <Field
          label="Slippage"
          value={slippage}
          onChange={setSlippage}
          suffix="%"
          placeholder="1.0"
        />
        <Field
          label="Protocol Fee"
          value={fee}
          onChange={setFee}
          suffix="%"
          placeholder="0.25"
        />
      </div>

      <div className="mt-4 rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
        <div className="text-sm text-[#9BB0C6]">Minimum you’ll receive</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">
          {isFinite(minOut) ? minOut.toFixed(6) : "—"} <span className="text-sm text-[#9BB0C6]">TOKEN B</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <CTA href="/create-account">Preview swap</CTA>
        <CTA href="/create-account" primary>Start swap</CTA>
      </div>
    </div>
  );
}

function FeeTierCard() {
  const [tier, setTier] = useState<"eco" | "normal" | "priority">("normal");
  return (
    <div className="rounded-2xl bg-[#101826]/90 ring-1 ring-white/10 p-5">
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4" />
        <div className="font-medium">Fee Tiers & Estimated Inclusion</div>
      </div>
      <p className="mt-1 text-sm text-[#9BB0C6]">
        Choose the fee that matches network congestion and urgency.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["eco", "normal", "priority"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`rounded-xl px-3 py-2 ring-1 transition ${
              tier === t
                ? "bg-white/15 ring-white/20"
                : "bg-white/5 ring-white/10 hover:bg-white/10"
            }`}
          >
            <div className="text-sm capitalize">{t}</div>
            <div className="text-[11px] text-[#9BB0C6]">
              {t === "eco" && "Cheapest • slowest"}
              {t === "normal" && "Balanced"}
              {t === "priority" && "Fastest • highest fee"}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
        <div className="flex items-center gap-2 text-sm text-[#9BB0C6]">
          <Info className="h-4 w-4" />
          <span>Estimated inclusion (illustrative):</span>
        </div>
        <div className="mt-1 text-lg font-semibold">
          {tier === "eco" && "10–45 min+ (congestion dependent)"}
          {tier === "normal" && "3–15 min"}
          {tier === "priority" && "Under 3 min"}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <CTA href="/create-account">Check live fee hints</CTA>
        <CTA href="/create-account" primary>Send with this tier</CTA>
      </div>
    </div>
  );
}

/* ------------------------------- Small atoms ------------------------------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-[#9BB0C6] mb-1">{label}</div>
      <div className="flex items-center rounded-xl bg-white/5 ring-1 ring-white/10 px-3">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent py-2 outline-none"
          inputMode="decimal"
        />
        {suffix ? <span className="ml-2 text-xs text-[#9BB0C6]">{suffix}</span> : null}
      </div>
    </label>
  );
}

function safeNum(n: string): number {
  const x = Number(n.replace(/,/g, ""));
  return isFinite(x) ? x : NaN;
}
