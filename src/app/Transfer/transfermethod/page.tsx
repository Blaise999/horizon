"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import { ChevronsRight, Search } from "lucide-react";

/**
 * Route: /Transfer/transfermethod
 * File:  app/Transfer/transfermethod/page.tsx
 */
export default function TransferMethodsPage() {
  const [q, setQ] = useState("");

  const methods: Method[] = [
    {
      id: "wire",
      title: "Wire Transfer",
      desc: "International bank transfer (SWIFT).",
      href: "/Transfer/wire",
      icon: <BankIcon />,
      tag: "International",
      brandBg: "bg-white/10 border-white/20 text-white/80",
    },
    {
      id: "usa",
      title: "USA Transfer",
      desc: "Domestic transfer in the U.S. (ACH/Wire).",
      href: "/Transfer/USA",
      icon: <USATransferIcon />,
      tag: "Domestic",
      brandBg: "bg-white/10 border-white/20 text-white/80",
    },
    {
      id: "crypto",
      title: "Cryptocurrency",
      desc: "Send to a crypto address or wallet.",
      href: "/Transfer/crypto",
      icon: <BitcoinLogo />,
      tag: "Digital",
      brandBg: "bg-[#F7931A]/15 border-[#F7931A]/40 text-[#F7931A]",
    },
    {
      id: "paypal",
      title: "PayPal",
      desc: "Transfer to your PayPal account.",
      href: "/Transfer/paypal",
      icon: <PayPalLogo />,
      tag: "Wallet",
      brandBg: "bg-[#003087]/15 border-[#003087]/40 text-[#003087]",
    },
    {
      id: "wise",
      title: "Wise Transfer",
      desc: "Low-cost cross-border transfers.",
      href: "/Transfer/wise",
      icon: <WiseLogo />,
      tag: "International",
      brandBg: "bg-[#00B9FF]/15 border-[#00B9FF]/40 text-[#00B9FF]",
    },
    {
      id: "venmo",
      title: "Venmo",
      desc: "Send funds to your Venmo account.",
      href: "/Transfer/venmo",
      icon: <VenmoLogo />,
      tag: "Wallet",
      brandBg: "bg-[#3D95CE]/15 border-[#3D95CE]/40 text-[#3D95CE]",
    },
    {
      id: "zelle",
      title: "Zelle",
      desc: "Fast bank-to-bank in the U.S.",
      href: "/Transfer/zelle",
      icon: <ZelleLogo />,
      tag: "Domestic",
      brandBg: "bg-[#6D1ED4]/15 border-[#6D1ED4]/40 text-[#6D1ED4]",
    },
    {
      id: "revolut",
      title: "Revolut",
      desc: "Transfer to your Revolut wallet.",
      href: "/Transfer/revolut",
      icon: <RevolutLogo />,
      tag: "Wallet",
      brandBg: "bg-[#0A0A0A]/15 border-[#0A0A0A]/40 text-white",
    },
    {
      id: "alipay",
      title: "Alipay",
      desc: "Send funds to Alipay.",
      href: "/Transfer/alipay",
      icon: <AlipayLogo />,
      tag: "Wallet",
      brandBg: "bg-[#1677FF]/15 border-[#1677FF]/40 text-[#1677FF]",
    },
    {
      id: "wechat",
      title: "WeChat Pay",
      desc: "Transfer to WeChat Pay wallet.",
      href: "/Transfer/wechat",
      icon: <WeChatPayLogo />,
      tag: "Wallet",
      brandBg: "bg-[#07C160]/15 border-[#07C160]/40 text-[#07C160]",
    },
    {
      id: "cashapp",
      title: "Cash App",
      desc: "Send to a $cashtag, phone, or email.",
      href: "/Transfer/cashapp",
      icon: <CashAppLogo />,
      tag: "Wallet",
      brandBg: "bg-[#00C244]/15 border-[#00C244]/40 text-[#00C244]",
    },
  ];

  const filtered = methods.filter(
    (m) =>
      m.title.toLowerCase().includes(q.toLowerCase()) ||
      m.desc.toLowerCase().includes(q.toLowerCase()) ||
      m.tag.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav
        userName={
          typeof window !== "undefined"
            ? localStorage.getItem("hb_user_name") || "User"
            : "User"
        }
        setupPercent={0}
        onOpenCardsManager={() => {}}
        onOpenInsights={() => {}}
        onOpenTransactions={() => {}}
        onOpenGoals={() => {}}
        onOpenRecurring={() => {}}
        onOpenSettings={() => {}}
        onOpenSupport={() => {}}
        onOpenProfile={() => {}}
      />

      <section className="pt-[120px] container-x">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-white/60 mb-2">
            <Link href="/dashboard/dashboard" className="hover:underline">
              Dashboard
            </Link>{" "}
            ▸ <span className="text-white/80">Transfer</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Select Transfer Method
            </h1>

            {/* Search */}
            <label className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/20 shadow-inner">
              <Search className="opacity-70 h-4 w-4" />
              <input
                type="search"
                aria-label="Search methods"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search methods..."
                className="bg-transparent outline-none text-sm placeholder:text-white/50"
              />
            </label>
          </div>

          <p className="text-white/70 mt-2">
            Choose where you want to send money. You can add new rails later in
            Settings &gt; Payments.
          </p>

          {/* Methods */}
          <div className="mt-6 rounded-3xl overflow-hidden border border-white/20 divide-y divide-white/10">
            {filtered.map((m) => (
              <MethodRow key={m.id} method={m} />
            ))}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-white/60">
                No methods found.
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <QuickCard
              title="Domestic transfer"
              desc="Send within the U.S."
              href="/Transfer/USA"
              variant="neutral"
            />
            <QuickCard
              title="International transfer"
              desc="Send across borders"
              href="/Transfer/intl"
              variant="brand"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

/* --------------------------------- Types ---------------------------------- */
type Method = {
  id: string;
  title: string;
  desc: string;
  href: string;
  icon: ReactNode;
  tag: string;
  /** Tailwind classes to apply brand accent on the icon container */
  brandBg: string;
};

/* ------------------------------ Subcomponents ------------------------------ */

function MethodRow({ method }: { method: Method }) {
  return (
    <Link
      href={method.href}
      className="group block px-5 py-4 hover:bg-white/[0.05] transition"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`h-11 w-11 rounded-2xl grid place-items-center border ${method.brandBg}`}
          >
            {method.icon}
          </div>
          <div>
            <div className="font-medium">{method.title}</div>
            <div className="text-sm text-white/60">{method.desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white/70">
            {method.tag}
          </span>
          <ChevronsRight className="opacity-60 group-hover:opacity-90 transition" />
        </div>
      </div>
    </Link>
  );
}

function QuickCard({
  title,
  desc,
  href,
  variant = "neutral",
}: {
  title: string;
  desc: string;
  href: string;
  variant?: "brand" | "neutral";
}) {
  const classes =
    variant === "brand"
      ? "bg-[#00E0FF]/15 border-[#00E0FF]/40"
      : "bg-white/[0.06] border-white/20";
  return (
    <Link
      href={href}
      className={`rounded-3xl p-5 border ${classes} hover:brightness-110 transition block`}
    >
      <div className="text-base font-semibold">{title}</div>
      <div className="text-sm text-white/70 mt-1">{desc}</div>
    </Link>
  );
}

/* ----------------------------- Brand SVG Icons ----------------------------- */
/* All icons use currentColor to inherit the brand color from the container.  */

function BankIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3 3 7v2h18V7l-9-4Zm-7 8v7H3v2h18v-2h-2v-7h-2v7H7v-7H5Z"
      />
    </svg>
  );
}

function USATransferIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M3 6h18v2H3zM3 11h12v2H3zM3 16h18v2H3z" />
    </svg>
  );
}

/* Bitcoin (₿) */
function BitcoinLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="currentColor" opacity="0.12" />
      <path
        fill="currentColor"
        d="M19.3 14.3c1-.6 1.6-1.5 1.6-2.7 0-2.3-1.8-3.6-4.7-3.6h-.7V6h-1.8v1.9H12v1.6h1.7v6.5H12v1.6h1.7V20H15v-1.9h.7c3.4 0 5.4-1.4 5.4-3.8 0-1.4-.7-2.4-1.8-3Zm-4.3-3.7h.7c1.7 0 2.6.6 2.6 1.8s-.9 1.9-2.6 1.9h-.7v-3.7Zm.7 9h-.7v-3.5h.7c1.9 0 3 .7 3 1.8s-1.1 1.7-3 1.7Z"
      />
    </svg>
  );
}

/* PayPal */
function PayPalLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden>
      <path
        fill="currentColor"
        d="M39.2 10.3c8.3 0 13.6 4.6 12.6 11.2-1.2 7.6-7.9 12-16.6 12H28l-2.5 13.1h-8.5L23 10.9h16.2Z"
        opacity="0.9"
      />
      <path
        fill="currentColor"
        d="M41.6 17.5c3.3 0 5.8 1.6 5.2 4.7-1 5.2-5.8 7.2-11.8 7.2h-5l-2.1 10.9h-6.9l3.2-16.7c.2-1 1.2-1.7 2.2-1.7h15.2Z"
        opacity="0.6"
      />
    </svg>
  );
}

/* Wise */
function WiseLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <path
        fill="currentColor"
        d="m6 6 7.5 5L11 17l3.5 9L26 6h-6.4L16 12.4 12 6H6Z"
      />
    </svg>
  );
}

/* Venmo */
function VenmoLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <path fill="currentColor" d="M7 5h18v22H7z" opacity="0.12" />
      <path
        fill="currentColor"
        d="M21.5 9c.2.6.3 1.3.3 2 0 4.3-3.7 9.5-6.4 12.8h-5L8 9h5.2l1 6.2c1.2-1.9 2.9-4.8 3.8-7.2h3.5Z"
      />
    </svg>
  );
}

/* Zelle */
function ZelleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <path fill="currentColor" d="M10 6h12v3H10zM10 23h12v3H10z" />
      <path fill="currentColor" d="M19 8h3l-9 16h-3l9-16Z" />
    </svg>
  );
}

/* Revolut (R) */
function RevolutLogo() {
  return (
    <svg width="18" height="20" viewBox="0 0 256 300" aria-hidden>
      <path
        fill="currentColor"
        d="M148 0c40 0 68 26 68 62 0 32-19 55-48 64l44 71h-58l-36-62h-9l-12 62H50L80 0h68Zm-35 49-9 46h18c17 0 29-9 29-25 0-13-10-21-25-21h-13Z"
      />
    </svg>
  );
}

/* Alipay */
function AlipayLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden>
      <rect x="6" y="10" width="52" height="44" rx="9" fill="currentColor" opacity="0.12" />
      <path
        fill="currentColor"
        d="M20 24h24v4H20v-4Zm2 8h20c-2.2 5.6-7.5 9.5-15.2 10.8l-.8-3.8c4.9-.9 8.2-2.9 9.8-7H22v-4Z"
      />
    </svg>
  );
}

/* WeChat Pay */
function WeChatPayLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden>
      <path
        fill="currentColor"
        d="M28 12c-11 0-20 7.1-20 15.8 0 5.1 3.3 9.6 8.3 12.3l-2 8.9 8.5-5.2c1.6.3 3.3.5 5.1.5 11 0 20-7.1 20-15.8S39 12 28 12Zm-7 15a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm10 0a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
      />
    </svg>
  );
}

/* Cash App ($) */
function CashAppLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden>
      <rect x="8" y="8" width="48" height="48" rx="12" fill="currentColor" opacity="0.14" />
      <path
        fill="currentColor"
        d="M35.9 20.5c-2.8-1.1-6-.6-8.3 1.2-2 1.5-3.1 3.8-3.1 6 0 3.5 2.4 6.2 6.5 7.4l2.2.6c1.7.5 2.5 1.1 2.5 2 0 .8-.5 1.6-1.5 2.1-1.1.6-2.7.7-4.3.3-1.3-.3-2.6-1-3.7-2l-3 3.7c1.7 1.6 3.8 2.6 6.1 3.1 3.3.8 6.8.4 9.3-1.1 2.4-1.4 3.9-3.8 3.9-6.6 0-3.7-2.5-6.2-6.9-7.5l-2.2-.6c-1.5-.4-2.2-1-2.2-1.9 0-.7.4-1.3 1.2-1.8 1-.6 2.3-.6 3.7-.2 1 .3 2 .8 2.9 1.6l2.7-3.5c-1.3-1.1-2.8-2-4.6-2.7Z"
      />
    </svg>
  );
}
