// app/invest/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart as LineIcon,
  ShieldCheck,
  Globe2,
  TrendingUp,
  Bitcoin,
  BarChart3,
  Layers,
  Wallet2,
  RefreshCcw,
} from "lucide-react";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";

/* ───────────────────────── Helpers & Types ───────────────────────── */
type Point = { x: number; y: number };
type Asset = {
  symbol: string;
  name: string;
  price: number; // in USD
  change1d: number; // %
  change7d: number; // %
  series: number[]; // normalized [0..1] sparkline
  kind: "stock" | "crypto" | "etf";
};

const ease = [0.16, 1, 0.3, 1] as const;

function fmtUsd(n: number, dp = 2) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function sign(n: number) {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** Generate viewbox points for a tiny sparkline based on 0..1 series */
function toSvgPoints(series: number[], width = 120, height = 40, pad = 2): Point[] {
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / Math.max(1, series.length - 1);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(1e-6, max - min);
  return series.map((v, i) => ({
    x: pad + i * step,
    y: pad + (1 - (v - min) / span) * h,
  }));
}

/* ───────────────────────── Mock Data (replace with API later) ───────────────────────── */
const FUNDS = [
  { name: "Horizon S&P Tracker", ytd: 12.4, fee: 0.06, series: [0.2, 0.22, 0.21, 0.25, 0.3, 0.28, 0.33, 0.35, 0.37, 0.4] },
  { name: "Global Clean Energy", ytd: 7.9, fee: 0.12, series: [0.4, 0.36, 0.38, 0.41, 0.44, 0.42, 0.45, 0.47, 0.5, 0.52] },
  { name: "Emerging Markets", ytd: 4.1, fee: 0.10, series: [0.3, 0.31, 0.29, 0.3, 0.33, 0.34, 0.35, 0.36, 0.36, 0.38] },
];

const ASSETS: Asset[] = [
  // Stocks
  { symbol: "AAPL", name: "Apple Inc.", price: 229.12, change1d: 0.84, change7d: 2.1, kind: "stock", series: [0.3,0.31,0.29,0.33,0.36,0.35,0.37,0.39,0.4,0.43] },
  { symbol: "MSFT", name: "Microsoft", price: 413.55, change1d: -0.42, change7d: 1.8, kind: "stock", series: [0.45,0.44,0.46,0.47,0.49,0.5,0.49,0.51,0.52,0.53] },
  { symbol: "NVDA", name: "NVIDIA", price: 118.02, change1d: 1.92, change7d: 6.4, kind: "stock", series: [0.4,0.43,0.44,0.46,0.5,0.54,0.52,0.55,0.58,0.6] },

  // Crypto
  { symbol: "BTC", name: "Bitcoin", price: 68420, change1d: -0.8, change7d: 3.9, kind: "crypto", series: [0.52,0.5,0.48,0.51,0.55,0.53,0.56,0.58,0.6,0.62] },
  { symbol: "ETH", name: "Ethereum", price: 3270, change1d: 1.2, change7d: 5.1, kind: "crypto", series: [0.35,0.36,0.38,0.39,0.41,0.4,0.43,0.44,0.46,0.49] },
  { symbol: "SOL", name: "Solana", price: 162.5, change1d: 2.8, change7d: 12.4, kind: "crypto", series: [0.22,0.24,0.27,0.29,0.31,0.33,0.34,0.37,0.41,0.45] },

  // ETFs
  { symbol: "HSPY", name: "Horizon S&P", price: 412.13, change1d: 0.31, change7d: 1.2, kind: "etf", series: [0.25,0.26,0.27,0.29,0.31,0.32,0.33,0.34,0.35,0.36] },
  { symbol: "QQQ", name: "NASDAQ 100", price: 498.22, change1d: -0.12, change7d: 1.9, kind: "etf", series: [0.4,0.41,0.39,0.42,0.44,0.45,0.46,0.46,0.48,0.49] },
  { symbol: "IEMG", name: "iShares EM", price: 54.02, change1d: 0.18, change7d: 0.9, kind: "etf", series: [0.28,0.29,0.28,0.29,0.3,0.31,0.31,0.32,0.33,0.34] },
];

/* ───────────────────────── Tiny Sparkline Component ───────────────────────── */
function Spark({ series, positive }: { series: number[]; positive: boolean }) {
  const width = 120, height = 40;
  const pts = useMemo(() => toSvgPoints(series, width, height, 2), [series]);
  const d = useMemo(() => {
    if (!pts.length) return "";
    return pts.map((p, i) => (i ? "L" : "M") + p.x + "," + p.y).join(" ");
  }, [pts]);
  // Area fill to bottom
  const area = useMemo(() => {
    if (!pts.length) return "";
    return `M${pts[0].x},${height} L${pts.map(p => `${p.x},${p.y}`).join(" L ")} L${pts[pts.length-1].x},${height} Z`;
  }, [pts]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={area} fill={positive ? "rgba(51,214,159,0.12)" : "rgba(255,107,107,0.12)"} />
      <path d={d} stroke={positive ? "rgb(51,214,159)" : "rgb(255,107,107)"} strokeWidth={1.8} fill="none" />
    </svg>
  );
}

/* ───────────────────────── DCA Backtest (Toy) ───────────────────────── */
type Cadence = "weekly" | "monthly";
function dcaSim(params: { amount: number; cadence: Cadence; priceSeries: number[] }) {
  const { amount, cadence, priceSeries } = params;
  const steps = priceSeries.length;
  const buys = cadence === "weekly" ? steps : Math.max(1, Math.floor(steps / 4));
  const freq = Math.floor(steps / buys);
  let shares = 0, invested = 0;

  for (let i = 0; i < steps; i += freq) {
    const px = priceSeries[i];
    if (px <= 0) continue;
    const units = amount / px;
    shares += units;
    invested += amount;
  }
  const lastPrice = priceSeries[priceSeries.length - 1] || 0;
  const value = shares * lastPrice;
  const pnl = value - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const avgCost = shares ? invested / shares : 0;
  return { shares, invested, value, pnl, pnlPct, avgCost, lastPrice };
}

/* ───────────────────────── Component ───────────────────────── */
export default function InvestGrowPage() {
  // Tabs
  const [tab, setTab] = useState<"crypto" | "stocks" | "etfs">("crypto");

  // DCA state (uses the visible tab’s first asset series transformed to pseudo-dollar series)
  const [dcaAmt, setDcaAmt] = useState(100);
  const [dcaCadence, setDcaCadence] = useState<Cadence>("weekly");

  // Allocation target (toy)
  const [alloc, setAlloc] = useState({ stocks: 60, crypto: 20, bonds: 10, cash: 10 });

  // Pick asset universe by tab
  const assetList = useMemo(() => ASSETS.filter(a => (tab === "crypto" ? a.kind === "crypto" : tab === "stocks" ? a.kind === "stock" : a.kind === "etf")), [tab]);

  // Build a fake price series for backtest from the first asset’s normalized sparkline scaled to its current price.
  const backtest = useMemo(() => {
    if (!assetList.length) return null;
    const ref = assetList[0];
    const base = ref.price;
    const norm = ref.series;
    // transform normalized (0..1) to historical prices around current (±15%)
    const hist = norm.map(v => base * (0.85 + v * 0.3)); // 0.85..1.15 * base
    return dcaSim({ amount: dcaAmt, cadence: dcaCadence, priceSeries: hist });
  }, [assetList, dcaAmt, dcaCadence]);

  const points = [
    { icon: <ShieldCheck />, t: "Smart Guardrails", d: "Risk-aware rebalancing and drawdown protection." },
    { icon: <Globe2 />, t: "Diverse Access", d: "US, EU, and NG instruments with fractional shares." },
    { icon: <TrendingUp />, t: "Auto-Invest", d: "DCA schedules, dividend drips, and tax lots." },
  ];

  // Allocation drift quick calc (toy portfolio snapshot)
  const currentAlloc = { stocks: 58, crypto: 24, bonds: 8, cash: 10 };
  const drift = {
    stocks: currentAlloc.stocks - alloc.stocks,
    crypto: currentAlloc.crypto - alloc.crypto,
    bonds: currentAlloc.bonds - alloc.bonds,
    cash: currentAlloc.cash - alloc.cash,
  };

  // Simple shimmer once
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="min-h-svh bg-[#0E131B] text-[#E6EEF7]">
      <NavBrand />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease } }}
          className="flex flex-col gap-3"
        >
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">Invest & Grow</h1>
          <p className="max-w-2xl text-[#9BB0C6]">
            Long-term wealth, simplified. Transparent fees, beautiful insights, and guardrails by default.
          </p>
        </motion.div>

        {/* Portfolio preview card with mini area */}
        <div className="mt-8 rounded-2xl bg-[#101826] ring-1 ring-white/10 p-6 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10"><LineIcon /></div>
            <div className="font-medium">Portfolio • 1Y</div>
            <span className="ml-2 text-xs text-white/60">Model</span>
          </div>
          <div className="mt-4 h-28 rounded-xl bg-gradient-to-b from-white/10 to-transparent relative overflow-hidden">
            {/* simple animated gradient hint */}
            {mounted && (
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(0,224,255,.2),transparent_60%),radial-gradient(120%_80%_at_90%_0%,rgba(155,92,255,.2),transparent_60%)]" />
            )}
          </div>
          <div className="mt-3 text-sm text-[#9BB0C6]">Past performance is not indicative of future results.</div>
        </div>

        {/* Popular funds with sparklines */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-[#101826] ring-1 ring-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-[#9BB0C6]">Popular funds</div>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Layers className="h-4 w-4" /> Fee displayed includes expense ratio
              </div>
            </div>
            <ul className="divide-y divide-white/5">
              {FUNDS.map((f) => (
                <li key={f.name} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-white/60">YTD {sign(f.ytd)} • {f.fee.toFixed(2)}% fee</div>
                  </div>
                  <Spark series={f.series} positive={f.ytd >= 0} />
                </li>
              ))}
            </ul>
          </div>

          {/* Pillars */}
          <div className="grid gap-4">
            {points.map((p, i) => (
              <motion.div
                key={p.t}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-5 bg-[#101826] ring-1 ring-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10">{p.icon}</div>
                  <h3 className="font-medium">{p.t}</h3>
                </div>
                <p className="mt-2 text-sm text-[#9BB0C6]">{p.d}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Asset Tabs */}
        <div className="mt-10 rounded-2xl bg-[#101826] ring-1 ring-white/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["crypto","stocks","etfs"] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-sm ring-1 transition",
                    tab === k ? "bg-white/10 ring-white/20" : "bg-white/5 ring-white/10 hover:bg-white/8"
                  )}
                >
                  {k === "crypto" ? "Crypto" : k === "stocks" ? "Stocks" : "ETFs"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <RefreshCcw className="h-4 w-4" />
              Mock prices
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assetList.map((a) => (
              <div key={a.symbol} className="flex items-center justify-between gap-4 rounded-xl p-4 ring-1 ring-white/10 bg-[#0F1622]/60 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center h-10 w-10 rounded-xl bg-white/5 ring-1 ring-white/10">
                    {a.kind === "crypto" ? <Bitcoin /> : a.kind === "stock" ? <BarChart3 /> : <Layers />}
                  </div>
                  <div>
                    <div className="font-medium">{a.symbol} • {a.name}</div>
                    <div className="text-xs text-white/60">
                      24h <span className={clsx(a.change1d>=0?"text-emerald-400":"text-rose-400")}>{sign(a.change1d)}</span>
                      <span className="mx-2">•</span>
                      7d <span className={clsx(a.change7d>=0?"text-emerald-400":"text-rose-400")}>{sign(a.change7d)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <Spark series={a.series} positive={a.series[a.series.length-1] >= a.series[0]} />
                  <div className="text-right">
                    <div className="font-semibold">{fmtUsd(a.price)}</div>
                    <div className={clsx("text-xs", a.change1d>=0?"text-emerald-400":"text-rose-400")}>{sign(a.change1d)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DCA Backtest & Allocation */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* DCA simulator */}
          <div className="rounded-2xl bg-[#101826] ring-1 ring-white/10 p-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10"><Wallet2 /></div>
              <div className="font-medium">DCA Backtest (toy) • {tab === "crypto" ? "Crypto" : tab === "stocks" ? "Stock" : "ETF"} basket</div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                Amount
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={dcaAmt}
                  onChange={(e) => setDcaAmt(Math.max(10, Number(e.target.value || 0)))}
                  className="ml-1 w-28 rounded-lg bg-white/5 ring-1 ring-white/10 px-2 py-1 outline-none"
                />
              </label>
              <div className="flex gap-2">
                {(["weekly","monthly"] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setDcaCadence(c)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg ring-1 text-xs",
                      dcaCadence===c ? "bg-white/10 ring-white/20" : "bg-white/5 ring-white/10 hover:bg-white/8"
                    )}
                  >
                    {c === "weekly" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#0F1622]/60 ring-1 ring-white/10 p-3">
                <div className="text-white/60 text-xs">Invested</div>
                <div className="font-semibold">{backtest ? fmtUsd(backtest.invested, 0) : "-"}</div>
              </div>
              <div className="rounded-xl bg-[#0F1622]/60 ring-1 ring-white/10 p-3">
                <div className="text-white/60 text-xs">Current value</div>
                <div className="font-semibold">{backtest ? fmtUsd(backtest.value, 0) : "-"}</div>
              </div>
              <div className="rounded-xl bg-[#0F1622]/60 ring-1 ring-white/10 p-3">
                <div className="text-white/60 text-xs">PnL</div>
                <div className={clsx("font-semibold", backtest && backtest.pnl>=0 ? "text-emerald-400" : "text-rose-400")}>
                  {backtest ? `${fmtUsd(backtest.pnl, 0)} (${sign(backtest.pnlPct)})` : "-"}
                </div>
              </div>
              <div className="rounded-xl bg-[#0F1622]/60 ring-1 ring-white/10 p-3">
                <div className="text-white/60 text-xs">Avg cost / Last</div>
                <div className="font-semibold">
                  {backtest ? `${fmtUsd(backtest.avgCost)} / ${fmtUsd(backtest.lastPrice)}` : "-"}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-white/60">
              Simulation uses normalized historical pattern scaled around the active asset’s current price. Replace with real OHLCV later.
            </div>
          </div>

          {/* Allocation & drift */}
          <div className="rounded-2xl bg-[#101826] ring-1 ring-white/10 p-5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10"><TrendingUp /></div>
              <div className="font-medium">Target Allocation</div>
            </div>

            {/* Target sliders */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {(["stocks","crypto","bonds","cash"] as const).map(k => (
                <label key={k} className="block">
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-white/80">{k}</span>
                    <span className="text-white/60">{(alloc as any)[k]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={(alloc as any)[k]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setAlloc(prev => ({ ...prev, [k]: v }));
                    }}
                    className="w-full accent-cyan-400"
                  />
                </label>
              ))}
            </div>

            {/* Pie bar (stacked) */}
            <div className="mt-4">
              <div className="text-xs text-white/60 mb-1">Target mix</div>
              <div className="h-3 w-full rounded-full overflow-hidden ring-1 ring-white/10 flex">
                <div style={{ width: `${alloc.stocks}%` }} className="bg-cyan-500/70" />
                <div style={{ width: `${alloc.crypto}%` }} className="bg-emerald-500/70" />
                <div style={{ width: `${alloc.bonds}%` }} className="bg-violet-500/70" />
                <div style={{ width: `${alloc.cash}%` }} className="bg-white/30" />
              </div>
            </div>

            {/* Drift */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {Object.entries(drift).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#0F1622]/60 ring-1 ring-white/10 p-3 flex items-center justify-between">
                  <span className="capitalize text-white/80">{k}</span>
                  <span className={clsx(v===0 && "text-white/70", v>0 && "text-emerald-400", v<0 && "text-rose-400")}>
                    {v>0 ? `+${v}%` : `${v}%`} drift
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-white/60">Rebalance when any drift exceeds ±5%.</div>
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
