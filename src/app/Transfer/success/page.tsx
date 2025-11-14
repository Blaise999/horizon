// app/Transfer/success/Success.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Nav from "@/app/dashboard/dashboardnav";
import { CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";

/* ---------------------------------------------------------------------------
   TransferSuccessPage
   - Flexible, rail-agnostic success page styled like your pending detail
   - Sources in priority: URL query → localStorage.last_transfer → hb_ledger by ref → latest ledger
   - Designed for deep-link via notifications: /Transfer/success?ref=<REFERENCE_ID>
--------------------------------------------------------------------------- */

type RailType =
  | "ach"
  | "ach_same_day"
  | "wire_domestic"
  | "wire_international"
  | "crypto"
  | "paypal"
  | "revolut"
  | "venmo"
  | "zelle"
  | "cashapp"
  | "alipay"
  | "billpay"
  | "deposit";

type Speed = "same_day" | "standard";

type TransferSummary = {
  status: "completed" | "processing" | "scheduled";
  type: RailType;
  createdAt: string;
  executedAt?: string;
  etaText?: string;

  amount: { value: number; currency: string };
  converted?: { value: number; currency: string; rate?: number; lockedAt?: string };
  fees: { app: number; network?: number; currency: string };

  sender: { accountName: string; accountMasked?: string };
  recipient: {
    name: string;
    accountMasked?: string;
    bankName?: string;
    country?: string;
    swift?: string;
    ibanMasked?: string;
    cryptoAddress?: string;
    network?: string;
  };

  railInfo?: {
    speed?: Speed;
    cutoffNote?: string;
    traceId?: string;
    confirmations?: { required: number; current: number; txHash?: string; explorerUrl?: string };
  };

  referenceId: string;
  note?: string;
};

function currencyFmt(n: number, ccy = "USD") {
  return n.toLocaleString(undefined, { style: "currency", currency: ccy });
}

export default function Success() {
  const router = useRouter();
  const params = useSearchParams();

  const [userName, setUserName] = useState("User");
  const [setupPercent, setSetupPercent] = useState<number | undefined>(undefined);
  const [summary, setSummary] = useState<TransferSummary | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUserName(localStorage.getItem("hb_user_name") || "User");
    const s = localStorage.getItem("hb_setup_percent");
    if (s) setSetupPercent(Number(s));
  }, []);

  // ---------- Build a robust summary from multiple sources ----------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const q = (k: string, d?: string) => params.get(k) ?? d;

    // 1) URL → explicit summary (optional)
    const fromQuery: TransferSummary | null = (() => {
      const typeQ = q("type") as RailType | undefined;
      const amountQ = q("amount");
      if (!typeQ || !amountQ) return null;

      const basic: TransferSummary = {
        status: (q("status", "completed") as any) || "completed",
        type: typeQ,
        createdAt: q("createdAt", new Date().toISOString())!,
        executedAt: q("executedAt", new Date().toISOString())!,
        etaText: q("etaText", "Delivered")!,
        amount: { value: Number(amountQ), currency: q("ccy", "USD")! },
        fees: {
          app: Number(q("fee", "0")),
          network: q("netFee") ? Number(q("netFee")!) : undefined,
          currency: q("feeCcy", q("ccy", "USD")!)!,
        },
        sender: {
          accountName: q("fromName", "Checking")!,
          accountMasked: q("fromMasked", "••••9876") || undefined,
        },
        recipient: {
          name: q("to", typeQ === "deposit" ? "Your account" : "Recipient")!,
          accountMasked: q("acct") || undefined,
          bankName: q("bank") || undefined,
          country: q("country") || undefined,
          swift: q("swift") || undefined,
          ibanMasked: q("iban") || undefined,
          cryptoAddress: q("addr") || undefined,
          network: q("net") || undefined,
        },
        railInfo: {
          speed: (q("speed") as Speed) || undefined,
          traceId: q("trace") || undefined,
          confirmations: params.get("tx")
            ? {
                required: Number(q("reqConf", "2")),
                current: Number(q("curConf", "2")),
                txHash: q("tx")!,
                explorerUrl: q("exp") || undefined,
              }
            : undefined,
        },
        referenceId: q(
          "ref",
          "TX_" + Math.random().toString(36).slice(2, 8).toUpperCase()
        )!,
        note: q("note") || undefined,
        converted: params.get("conv")
          ? {
              value: Number(q("conv", "0")),
              currency: q("convCcy", "EUR")!,
              rate: Number(q("rate", "0.92")),
              lockedAt: new Date().toISOString(),
            }
          : undefined,
      };
      return basic;
    })();

    // 2) localStorage.last_transfer (if your flow saved a canonical object)
    const fromLastTransfer: TransferSummary | null = (() => {
      try {
        const raw = localStorage.getItem("last_transfer");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.referenceId && parsed.amount?.value) {
          const safeFees =
            parsed.fees && typeof parsed.fees.app === "number"
              ? parsed.fees
              : {
                  app: Number(parsed.fee || 0),
                  currency: parsed.currency || "USD",
                };

          const safe: TransferSummary = {
            ...parsed,
            status: "completed",
            amount: parsed.amount,
            fees: safeFees,
            sender: parsed.sender || {
              accountName: "Checking",
              accountMasked: "••••9876",
            },
            recipient: parsed.recipient || {
              name: "Recipient",
              accountMasked: "••••1234",
            },
          };
          return safe;
        }
      } catch {}
      return null;
    })();

    // 3) hb_ledger by reference (preferred)
    const refQ = q("ref");
    const fromLedgerByRef: TransferSummary | null = (() => {
      if (!refQ) return null;
      try {
        const arr = JSON.parse(localStorage.getItem("hb_ledger") || "[]");
        const m = arr.find((x: any) => x?.id === refQ || x?.referenceId === refQ);
        if (!m) return null;
        const s = normalizeLedgerToSummary(m);
        // force completed styling for this page
        s.status = "completed";
        return s;
      } catch {}
      return null;
    })();

    // 4) newest ledger entry as a last resort
    const fromLedgerLatest: TransferSummary | null = (() => {
      try {
        const arr = JSON.parse(localStorage.getItem("hb_ledger") || "[]");
        if (!arr.length) return null;
        const s = normalizeLedgerToSummary(arr[0]);
        s.status = "completed";
        return s;
      } catch {}
      return null;
    })();

    setSummary(
      fromQuery ||
        fromLedgerByRef ||
        fromLastTransfer ||
        fromLedgerLatest ||
        makeBasicFallback()
    );
  }, [params]);

  if (!summary) return null;

  const header = headerTitle(summary);
  const meta = `${new Date(
    summary.executedAt || summary.createdAt
  ).toLocaleString()} • Ref: ${summary.referenceId}`;

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} setupPercent={setupPercent} />
      <section className="container-x pt-[120px] pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl border border-white/15 bg-gradient-to-br from-[#0F1622] to-[#0B0F14] p-8 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 grid place-items-center">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">{header}</h1>
              <p className="text-white/70 mt-1">{meta}</p>
              <p className="text-white/80 mt-2">
                This transfer has been <b>successfully processed.</b>{" "}
                The transaction details are recorded and will appear in your activity and statements.
              </p>
            </div>
          </div>

          {/* Primary */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <Info
              label={summary.type === "deposit" ? "Amount credited" : "Amount sent"}
              value={currencyFmt(summary.amount.value, summary.amount.currency)}
            />
            <Info
              label={summary.type === "deposit" ? "Credited to" : "Recipient"}
              value={recipientLabel(summary)}
            />
            <Info
              label="From account"
              value={`${summary.sender.accountName}${
                summary.sender.accountMasked ? ` ${summary.sender.accountMasked}` : ""
              }`}
            />
            <Info label="Rail" value={railLabel(summary)} />
          </div>

          {/* FX/fees */}
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            {summary.converted && (
              <Info
                label="Conversion"
                value={`${currencyFmt(
                  summary.converted.value,
                  summary.converted.currency
                )} ${
                  summary.converted.rate ? `• Rate ${summary.converted.rate}` : ""
                }`}
              />
            )}
            <Info
              label="Fees"
              value={
                summary.fees.network
                  ? `App ${currencyFmt(
                      summary.fees.app,
                      summary.fees.currency
                    )} • Network ${currencyFmt(
                      summary.fees.network,
                      summary.fees.currency
                    )}`
                  : `${currencyFmt(summary.fees.app, summary.fees.currency)}`
              }
            />
          </div>

          {/* Rail extras (hash/trace) */}
          <RailExtras data={summary} />

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            {/* Hook up when your receipt endpoint is ready */}
            <button className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20">
              Download receipt
            </button>
            <button
              className="ml-auto px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 flex items-center gap-2"
              onClick={() => router.push("/dashboard/dashboard")}
            >
              Back to dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ------------------------------ Helpers/Parts ------------------------------ */

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-base font-medium break-words">{value || "—"}</div>
    </div>
  );
}

function railLabel(d: TransferSummary) {
  switch (d.type) {
    case "ach":
      return `ACH${
        d.railInfo?.speed === "same_day" ? " (Same-Day)" : " (Standard)"
      }`;
    case "ach_same_day":
      return "ACH (Same-Day)";
    case "wire_domestic":
      return "Wire (Domestic)";
    case "wire_international":
      return "SWIFT / International";
    case "crypto": {
      // 🔐 SAFE: recipient may be missing on older saved objects
      const net =
        d.recipient?.network ||
        (d.railInfo as any)?.network ||
        undefined;
      return `Crypto${net ? ` (${net})` : ""}`;
    }
    case "billpay":
      return "Bill Pay";
    case "deposit":
      return "Deposit";
    case "paypal":
      return "PayPal";
    case "revolut":
      return "Revolut";
    case "venmo":
      return "Venmo";
    case "zelle":
      return "Zelle";
    case "cashapp":
      return "Cash App";
    case "alipay":
      return "Alipay";
    default:
      return "Transfer";
  }
}

function recipientLabel(d: TransferSummary) {
  // 🔐 also guard recipient so we don't blow up on missing object
  const r = d.recipient || { name: "Recipient" };
  if (d.type === "deposit") {
    return `${d.sender.accountName}${
      d.sender.accountMasked ? ` ${d.sender.accountMasked}` : ""
    }`;
  }
  const acct = r.accountMasked ? ` • ${r.accountMasked}` : "";
  return `${r.name}${acct}`;
}

function headerTitle(d: TransferSummary) {
  if (d.type === "deposit") return "Deposit posted";
  if (d.type === "billpay") return "Payment sent";
  return "Transfer sent";
}

function RailExtras({ data }: { data: TransferSummary }) {
  if (data.type === "wire_domestic" && data.railInfo?.traceId) {
    return (
      <div className="mt-4 text-sm text-white/70">
        Fedwire Trace: <span className="text-white">{data.railInfo.traceId}</span>
      </div>
    );
  }
  if (data.type === "crypto" && data.railInfo?.confirmations?.txHash) {
    const c = data.railInfo.confirmations;
    return (
      <div className="mt-4 text-sm text-white/70 flex items-center gap-2">
        Tx Hash: <span className="text-white break-all">{c.txHash}</span>
        {c.explorerUrl && (
          <a
            href={c.explorerUrl}
            target="_blank"
            className="inline-flex items-center gap-1 text-[#00E0FF]"
          >
            View on explorer <ExternalLink size={14} />
          </a>
        )}
      </div>
    );
  }
  return null;
}

/* ------------------------------ Normalizers ------------------------------ */

function normalizeLedgerToSummary(m: any): TransferSummary {
  // Expected ledger shape (your flows already write this)
  // {
  //   id, type, rail, direction, fromAccount, amount, currency, fee, totalDebit,
  //   recipient/payee, status, createdAt, executedAt?, note, ...
  // }
  const type: RailType = (m.type || m.rail || "ach") as RailType;
  const currency = m.currency || "USD";
  const amt = Number(m.amount || m.usd || 0);
  const appFee = Number(m.fee || 0);

  const sender = {
    accountName: m.fromAccount || "Checking",
    accountMasked: m.fromMasked || "••••9876",
  };

  const rName =
    m?.recipient?.name ||
    m?.payee?.name ||
    m?.to ||
    (type === "deposit" ? "Your account" : "Recipient");

  const summary: TransferSummary = {
    status: (m.status as any) || "completed",
    type,
    createdAt: m.createdAt || new Date().toISOString(),
    executedAt: m.executedAt || m.createdAt || new Date().toISOString(),
    etaText: m.etaText || (type === "ach" ? "1–3 business days" : "Delivered"),
    amount: { value: amt, currency },
    fees: { app: appFee, currency },
    sender,
    recipient: {
      name: rName,
      accountMasked:
        m?.recipient?.accountMasked ||
        m?.payee?.accountRef ||
        m?.recipientAccountMasked,
      bankName: m?.recipient?.bankName || m?.bankName,
      country: m?.recipient?.country || m?.bankCountry,
      swift: m?.recipient?.swift || m?.swiftBic,
      ibanMasked: m?.recipient?.ibanMasked || m?.ibanOrAcct,
      cryptoAddress: m?.recipient?.cryptoAddress,
      network: m?.recipient?.network,
    },
    railInfo: m.railInfo,
    referenceId:
      m.referenceId ||
      m.id ||
      "TX_" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    note: m.memo || m.note,
  };

  return summary;
}

function makeBasicFallback(): TransferSummary {
  return {
    status: "completed",
    type: "ach",
    createdAt: new Date().toISOString(),
    executedAt: new Date().toISOString(),
    etaText: "Delivered",
    amount: { value: 100, currency: "USD" },
    fees: { app: 0, currency: "USD" },
    sender: { accountName: "Checking", accountMasked: "••••9876" },
    recipient: { name: "Recipient", accountMasked: "••••1234" },
    referenceId:
      "TX_" + Math.random().toString(36).slice(2, 8).toUpperCase(),
  };
}
