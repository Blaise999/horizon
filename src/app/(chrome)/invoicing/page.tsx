// app/transfers/how-it-works/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";
import {
  Landmark,
  Banknote,
  Send,
  ArrowLeftRight,
  QrCode,
  Wallet,
  Bitcoin,
  CreditCard,
  Building2,
  Globe2,
  FileText,
  PercentCircle,
  CalendarClock,
  Timer,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

/* Motion helpers */
const ease = [0.16, 1, 0.3, 1] as const;
const fade = (d = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: d, ease } },
});

type Rail = {
  key: string;
  title: string;
  icon: React.ReactNode;
  symbol: string;
  summary: string;
  cutoff: string;
  window: string;
  steps: string[];
  requirements: string[];
  kyc?: string[];
  notes?: string[];
};

/* Data */
const rails: Rail[] = [
  {
    key: "ach",
    title: "ACH (US bank transfer)",
    icon: <Landmark className="h-5 w-5" />,
    symbol: "ACH",
    summary: "Low-cost domestic US bank-to-bank transfers.",
    cutoff: "Weekdays • 5:00 PM local bank time",
    window: "Standard: 1–3 business days • Same-Day: same day (fees apply)",
    steps: [
      "Link & verify US bank account.",
      "Choose Standard or Same-Day ACH.",
      "We submit to ACH network; receiver posts after settlement.",
    ],
    requirements: ["Routing number", "Account number", "Account holder name"],
    kyc: ["Government ID", "SSN/ITIN (where required)", "US address"],
    notes: ["Returns possible for NSF/wrong details • Bank holidays excluded."],
  },
  {
    key: "wire_domestic",
    title: "Domestic Wire (US)",
    icon: <Banknote className="h-5 w-5" />,
    symbol: "WIRE",
    summary: "Fast US bank wire—often same day if before cut-off.",
    cutoff: "Weekdays • 3:00 PM local bank time",
    window: "Same day (often hours) if before cut-off, else next business day",
    steps: ["Add beneficiary", "Submit with purpose/memo", "Routed via Fedwire; receiver credits"],
    requirements: ["Bank name", "Routing (ABA)", "Account number", "Beneficiary name"],
    kyc: ["Government ID", "Source of funds for large amounts"],
    notes: ["Irreversible once sent—double-check details."],
  },
  {
    key: "swift",
    title: "International Wire (SWIFT)",
    icon: <Globe2 className="h-5 w-5" />,
    symbol: "SWIFT",
    summary: "Cross-border transfer via SWIFT and correspondents.",
    cutoff: "Weekdays • ~2:00 PM UTC (varies by corridor)",
    window: "Typically 1–3 business days; longer on exotic routes",
    steps: [
      "Add beneficiary with IBAN or account number",
      "Provide SWIFT/BIC and purpose of payment",
      "Sent via correspondents; receiver credits after checks",
    ],
    requirements: ["IBAN/account", "SWIFT/BIC", "Beneficiary name & address", "Payment purpose"],
    kyc: ["Government ID", "Proof of address", "Source of funds (amount/region dependent)"],
    notes: ["Intermediary fees may apply • Holidays and compliance can delay."],
  },
  {
    key: "p2p",
    title: "P2P (Horizon ↔ Horizon)",
    icon: <Send className="h-5 w-5" />,
    symbol: "P2P",
    summary: "Instant person-to-person transfers within Horizon.",
    cutoff: "None (24/7)",
    window: "Instant",
    steps: ["Find @handle/email/phone", "Enter amount & note", "Recipient credited instantly"],
    requirements: ["Recipient handle/email/phone"],
  },
  {
    key: "zelle",
    title: "Zelle®",
    icon: <ArrowLeftRight className="h-5 w-5" />,
    symbol: "ZELLE",
    summary: "US instant/near-instant transfers to enrolled banks.",
    cutoff: "None (bank policies vary)",
    window: "Instant or minutes (bank dependent)",
    steps: ["Add recipient email/US phone", "Send amount", "Recipient receives in bank app"],
    requirements: ["Recipient email or US mobile number"],
  },
  {
    key: "cashapp",
    title: "Cash App",
    icon: <Wallet className="h-5 w-5" />,
    symbol: "$",
    summary: "Send to $cashtag or phone/email in-network.",
    cutoff: "None (24/7)",
    window: "Instant in-network",
    steps: ["Enter $cashtag/phone/email", "Confirm amount", "Sent instantly"],
    requirements: ["Recipient $cashtag/phone/email"],
  },
  {
    key: "paypal",
    title: "PayPal",
    icon: <CreditCard className="h-5 w-5" />,
    symbol: "PP",
    summary: "Global wallet. Send by email; withdraw later.",
    cutoff: "None (24/7)",
    window: "Instant in-network • Bank withdrawals vary",
    steps: ["Enter recipient email", "Pay from balance/card/bank", "Recipient gets PayPal credit"],
    requirements: ["Recipient PayPal email"],
  },
  {
    key: "revolut",
    title: "Revolut",
    icon: <Building2 className="h-5 w-5" />,
    symbol: "R",
    summary: "Fast transfers to Revolut users; bank payouts supported.",
    cutoff: "None (in-app 24/7)",
    window: "Instant in-network • Bank payouts vary",
    steps: ["Pick contact", "Confirm amount", "Delivered instantly in-app"],
    requirements: ["Recipient Revolut contact/phone"],
  },
  {
    key: "venmo",
    title: "Venmo",
    icon: <Wallet className="h-5 w-5" />,
    symbol: "V",
    summary: "US social payments; instant to Venmo wallet.",
    cutoff: "None (24/7)",
    window: "Instant in-network • Instant bank cash-out has fees",
    steps: ["Search @username/phone", "Send with note", "Recipient gets Venmo balance"],
    requirements: ["Recipient handle/phone"],
  },
  {
    key: "wise",
    title: "Wise",
    icon: <Globe2 className="h-5 w-5" />,
    symbol: "WISE",
    summary: "International transfers at real-rate FX.",
    cutoff: "Varies by route",
    window: "Minutes to 1–2 business days (pair-dependent)",
    steps: ["Add local bank details", "Convert at mid-market FX", "Funds land in local account"],
    requirements: ["Local account details (route-specific)"],
  },
  {
    key: "wechat",
    title: "WeChat Pay",
    icon: <QrCode className="h-5 w-5" />,
    symbol: "微信",
    summary: "QR and in-app transfers in WeChat ecosystem.",
    cutoff: "None",
    window: "Instant",
    steps: ["Scan/select contact", "Confirm amount", "Instant wallet transfer"],
    requirements: ["WeChat account / QR"],
  },
  {
    key: "alipay",
    title: "Alipay",
    icon: <QrCode className="h-5 w-5" />,
    symbol: "支付宝",
    summary: "QR and in-app transfers in Alipay ecosystem.",
    cutoff: "None",
    window: "Instant",
    steps: ["Scan/select contact", "Confirm amount", "Instant wallet transfer"],
    requirements: ["Alipay account / QR"],
  },
  {
    key: "billpay",
    title: "Bill Pay (ACH/Check)",
    icon: <FileText className="h-5 w-5" />,
    symbol: "BILL",
    summary: "Pay vendors via ACH or mailed check fallback.",
    cutoff: "ACH: Weekdays 5:00 PM • Check: print windows vary",
    window: "ACH: 1–3 bd • Check: 5–9 mailing days",
    steps: ["Add vendor", "Choose ACH or Check", "Track clearing/delivery"],
    requirements: ["Vendor bank info (ACH) or postal address (Check)"],
  },
  {
    key: "crypto",
    title: "Crypto (Send/Receive)",
    icon: <Bitcoin className="h-5 w-5" />,
    symbol: "₿",
    summary: "On-chain transfers; irreversible once confirmed.",
    cutoff: "None (network congestion varies)",
    window: "Minutes to hours (chain/fees)",
    steps: [
      "Paste address or scan QR",
      "Select network & fee",
      "Broadcast and wait for confirmations",
    ],
    requirements: ["Correct chain (BTC/ETH/TRON…)", "Compatible address"],
    notes: ["Always match network (ERC-20 ≠ TRC-20) • On-chain is final."],
  },
];

/* Public status legend (no admin wording) */
const statuses = [
  { label: "DRAFT", desc: "Created but not submitted." },
  { label: "OTP_REQUIRED", desc: "Extra verification is required before processing." },
  { label: "PROCESSING", desc: "Queued and being sent on the selected rail." },
  { label: "SCHEDULED", desc: "Approved and set to execute at a future time." },
  { label: "COMPLETED", desc: "Cleared and posted to the destination." },
  { label: "REJECTED", desc: "Failed or canceled by the sender or network." },
  { label: "REFUNDED", desc: "Funds reversed or returned to source." },
];

export default function HowTransfersWorkPage() {
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
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-6">
        <motion.div {...fade(0)} className="rounded-2xl bg-white/[.08] p-6 ring-1 ring-white/15 backdrop-blur-xl">
          <HeaderHairline />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <h1 className="text-[28px] md:text-[40px] font-semibold tracking-[-0.02em]">
              How Transfers Work
            </h1>
            <div className="flex flex-wrap gap-2 text-xs md:ml-auto">
              <Pill icon={<PercentCircle className="h-3.5 w-3.5" />}>Transparent rails</Pill>
              <Pill icon={<KeyRound className="h-3.5 w-3.5" />}>Secure steps</Pill>
              <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />}>Clear statuses</Pill>
            </div>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-white/80">
            Cut-off times, typical arrival windows, what details you need, and the exact path your money takes—presented simply and beautifully.
          </p>

          <div className="mt-4 flex gap-2">
            <CTA href="/create-account" primary>Start a transfer</CTA>
          </div>
        </motion.div>
      </section>

      {/* STATUS TIMELINE (horizontal, scrollable) */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        <motion.div {...fade(0.05)} className="rounded-2xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-2xl p-5">
          <HeaderHairline />
          <div className="font-medium tracking-[-0.01em]">Status roadmap</div>
          <div className="mt-4 overflow-x-auto">
            <ol className="flex items-stretch gap-3 min-w-[720px]">
              {statuses.map((s, i) => (
                <li key={s.label} className="flex-1 min-w-[200px]">
                  <div className="h-full rounded-xl bg-[#101826]/85 ring-1 ring-white/10 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-[#9BB0C6]">{String(i + 1).padStart(2, "0")}</div>
                    <div className="mt-1 inline-flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 bg-white/10 ring-1 ring-white/10 text-xs">{s.label}</span>
                    </div>
                    <div className="mt-2 text-sm text-[#9BB0C6]">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </motion.div>
      </section>

      {/* RAILS: Symbols + accordion grid */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        {/* Symbols strip */}
        <motion.div {...fade(0.08)} className="rounded-2xl bg-white/[.06] ring-1 ring-white/12 backdrop-blur-2xl p-5">
          <HeaderHairline />
          <div className="text-sm text-[#9BB0C6]">Rails & symbols</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rails.map((r) => (
              <div
                key={r.key}
                className="group rounded-xl bg-[#101826]/85 ring-1 ring-white/10 p-4 transition hover:-translate-y-[1px] hover:shadow-[0_14px_40px_rgba(0,0,0,.45)]"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">{r.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-[12px] text-white/60">{r.symbol}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Accordion grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {rails.map((r, i) => (
            <motion.div
              key={r.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: i * 0.04, ease, duration: 0.5 }}
              className="relative rounded-2xl bg-[#101826]/90 ring-1 ring-white/10"
            >
              <GradientStripe />
              <div className="p-5">
                <RailAccordion rail={r} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <CTA href="/create-account" primary>Transfer</CTA>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}

/* ── Local UI atoms ─────────────────────────────────────────────── */

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

function GradientStripe() {
  return (
    <span
      aria-hidden
      className="absolute inset-x-0 top-0 h-[2px] opacity-80"
      style={{
        background:
          "linear-gradient(90deg, rgba(0,224,255,.9), rgba(155,92,255,.6))",
      }}
    />
  );
}

function Pill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-white/80">
      {icon} {children}
    </span>
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10">{icon}</div>
      <div className="text-sm">
        <div className="text-[#9BB0C6]">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function RailAccordion({ rail }: { rail: Rail }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10">{rail.icon}</div>
          <div>
            <div className="font-medium">{rail.title}</div>
            <div className="text-xs text-[#9BB0C6]">{rail.summary}</div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <InfoRow icon={<CalendarClock className="h-4 w-4" />} label="Cut-off time" value={rail.cutoff} />
          <InfoRow icon={<Timer className="h-4 w-4" />} label="Typical window" value={rail.window} />

          <div>
            <div className="text-xs uppercase tracking-wide text-[#9BB0C6]">Steps</div>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-[#E6EEF7]">
              {rail.steps.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-[#9BB0C6]">Required details</div>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-[#E6EEF7]">
              {rail.requirements.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          </div>

          {!!rail.kyc?.length && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[#9BB0C6]">KYC documents</div>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-[#E6EEF7]">
                {rail.kyc!.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>
          )}

          {!!rail.notes?.length && (
            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
              <div className="text-xs uppercase tracking-wide text-[#9BB0C6]">Notes</div>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-[#E6EEF7]">
                {rail.notes!.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>
          )}

          <div className="pt-2">
            <CTA href="/create-account">Start with {rail.symbol}</CTA>
          </div>
        </div>
      )}
    </div>
  );
}
