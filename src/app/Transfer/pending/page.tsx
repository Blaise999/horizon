// app/Transfer/pending/Pending.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Nav from "@/app/dashboard/dashboardnav";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldQuestion,
  ArrowRight,
  Copy,
} from "lucide-react";
// ✅ your client lives at src/lib/api.ts (singular)
import { getPendingByRef } from "@/libs/api";

/**
 * Pending screen (rail-agnostic, resilient).
 * Load priority:
 *  1) ?ref=<id> → server (getPendingByRef)
 *  2) localStorage.last_transfer (saved by initiators)
 *  3) querystring fallbacks (for dev)
 */

type RailType =
  | "ach"
  | "ach_same_day"
  | "wire_domestic"
  | "wire_international"
  | "card_instant"
  | "paypal"
  | "wise"
  | "revolut"
  | "venmo"
  | "zelle"
  | "cashapp"
  | "wechat"
  | "alipay"
  | "crypto";

type PendingStatus =
  | "pending"
  | "processing"
  | "scheduled"
  | "otp_required"
  | "completed"
  | "rejected";

type Money = { value: number; currency: string };

type PendingSummary = {
  status: PendingStatus;
  type: RailType;
  /** raw rail straight from backend: e.g. "crypto_buy" | "crypto_swap" | "crypto_send" */
  railRaw?: string;
  /** normalized crypto kind */
  cryptoKind?: "buy" | "swap" | "send";

  createdAt: string;
  etaText?: string;

  amount: Money;
  fees?: { app?: number; network?: number; currency?: string };

  sender?: { accountName?: string; accountMasked?: string };
  recipient?: {
    name?: string;
    email?: string;
    tag?: string;
    accountMasked?: string;
    cryptoAddress?: string;
    network?: string;
  };

  referenceId: string;
  cancelable?: boolean;
  note?: string;

  // 🔹 crypto-specific
  cryptoAmount?: number;
  cryptoSymbol?: string;
};

/* ---------------------------- helpers & mappers ---------------------------- */

const asNumber = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Accept strings, numbers, booleans, Dates, and {name:"..."} objects
function firstTruthy(...vals: any[]) {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === "string") {
      const s = v.trim();
      if (s) return s;
      continue;
    }
    if (
      typeof v === "number" ||
      typeof v === "boolean" ||
      v instanceof Date
    ) {
      return String(v);
    }
    if (
      typeof v === "object" &&
      typeof (v as any).name === "string" &&
      (v as any).name.trim()
    ) {
      return (v as any).name.trim();
    }
  }
  return undefined;
}

function railLabel(t: RailType, net?: string) {
  switch (t) {
    case "ach":
      return "ACH (Standard)";
    case "ach_same_day":
      return "ACH (Same-day)";
    case "wire_domestic":
      return "Wire (Domestic)";
    case "wire_international":
      return "SWIFT / International";
    case "card_instant":
      return "Card (Instant)";
    case "paypal":
      return "PayPal";
    case "wise":
      return "Wise";
    case "revolut":
      return "Revolut";
    case "venmo":
      return "Venmo";
    case "zelle":
      return "Zelle";
    case "cashapp":
      return "Cash App";
    case "wechat":
      return "WeChat Pay";
    case "alipay":
      return "Alipay";
    case "crypto":
      return net ? `Crypto • ${net}` : "Crypto";
    default:
      return "Transfer";
  }
}

/** Normalize backend payload → PendingSummary (tolerant to shape differences). */
function mapServerToSummary(src: any): PendingSummary {
  // status
  const rawStatus: string =
    src?.status || src?.state || src?.phase || src?.transfer?.status || "pending";

  const status: PendingStatus =
    rawStatus.toLowerCase() === "otp_required"
      ? "otp_required"
      : rawStatus.toLowerCase() === "processing"
      ? "processing"
      : rawStatus.toLowerCase() === "scheduled"
      ? "scheduled"
      : rawStatus.toLowerCase() === "completed"
      ? "completed"
      : rawStatus.toLowerCase() === "rejected"
      ? "rejected"
      : "pending";

  // rail (normalize detailed rails -> high-level type)
  const rawRail: string =
    src?.type || src?.rail || src?.transfer?.rail || src?.meta?.rail || "ach";

  let t: RailType = "ach";
  let cryptoKind: "buy" | "swap" | "send" | undefined;

  if (
    rawRail === "crypto_buy" ||
    rawRail === "crypto_swap" ||
    rawRail === "crypto_send"
  ) {
    t = "crypto";
    if (rawRail === "crypto_buy") cryptoKind = "buy";
    else if (rawRail === "crypto_swap") cryptoKind = "swap";
    else if (rawRail === "crypto_send") cryptoKind = "send";
  } else if (
    rawRail === "ach" ||
    rawRail === "ach_same_day" ||
    rawRail === "wire_domestic" ||
    rawRail === "wire_international" ||
    rawRail === "card_instant" ||
    rawRail === "paypal" ||
    rawRail === "wise" ||
    rawRail === "revolut" ||
    rawRail === "venmo" ||
    rawRail === "zelle" ||
    rawRail === "cashapp" ||
    rawRail === "wechat" ||
    rawRail === "alipay"
  ) {
    t = rawRail as RailType;
  } else {
    // fall back – in case backend sends something slightly different
    t = (rawRail as RailType) || "ach";
  }

  const payload = src?.payload || src?.transfer?.payload || src?.ctx || {};

  // 🔹 crypto meta (symbol / qty / address / network) from many possible shapes
  const cryptoMeta =
    src?.crypto ||
    src?.meta?.crypto ||
    src?.transfer?.crypto ||
    src?.transfer?.meta?.crypto ||
    src?.ctx?.crypto ||
    src?.payload?.crypto ||
    undefined;

  const cryptoSymbolRaw =
    cryptoMeta?.symbol ||
    cryptoMeta?.asset ||
    cryptoMeta?.ticker ||
    payload.fromSymbol ||
    payload.assetSymbol ||
    payload.toSymbol ||
    src?.cryptoSymbol ||
    src?.symbol ||
    src?.asset ||
    undefined;

  const cryptoAmount =
    cryptoMeta?.qty != null
      ? asNumber(cryptoMeta.qty)
      : cryptoMeta?.amount != null
      ? asNumber(cryptoMeta.amount)
      : payload.units != null
      ? asNumber(payload.units)
      : payload.amountUnits != null
      ? asNumber(payload.amountUnits)
      : payload.fromUnits != null
      ? asNumber(payload.fromUnits)
      : src?.cryptoAmount != null
      ? asNumber(src.cryptoAmount)
      : src?.amountCrypto != null
      ? asNumber(src.amountCrypto)
      : undefined;

  const cryptoAddress = firstTruthy(
    src?.cryptoAddress,
    src?.toAddress,
    src?.address,
    cryptoMeta?.address,
    cryptoMeta?.toAddress,
    src?.payload?.cryptoAddress,
    src?.ctx?.cryptoAddress,
    src?.ctx?.toAddress,
    payload.toAddress
  );

  const cryptoNetwork = firstTruthy(
    src?.network,
    src?.blockchain,
    src?.chain,
    src?.transfer?.network,
    cryptoMeta?.network,
    cryptoMeta?.chain,
    cryptoMeta?.blockchain,
    src?.payload?.network,
    src?.ctx?.network,
    payload.network
  );

  // amount / fees (fiat)
  const amountObj =
    src?.amount ??
    src?.transfer?.amount ?? {
      value: src?.usd ?? src?.value ?? src?.total ?? 0,
      currency: src?.currency ?? "USD",
    };

  const appFee = src?.fees?.app ?? src?.fee ?? undefined;
  const netFee =
    src?.fees?.network ?? src?.networkFee ?? src?.fees?.net ?? undefined;
  const feeCcy =
    src?.fees?.currency ?? src?.feeCurrency ?? amountObj?.currency ?? "USD";

  // sender
  const sender = {
    accountName:
      src?.fromAccount ??
      src?.sender?.accountName ??
      src?.transfer?.fromAccount ??
      undefined,
    accountMasked:
      src?.sender?.accountMasked ??
      src?.transfer?.sender?.accountMasked ??
      undefined,
  };

  // recipient
  const recipient = {
    name: firstTruthy(
      src?.recipient?.name,
      src?.to?.name,
      src?.beneficiary?.name,
      src?.payee?.name,
      src?.counterparty?.name,
      src?.recipient,
      src?.to
    ),
    email: firstTruthy(
      src?.beneficiary?.email,
      src?.payee?.email,
      src?.toEmail,
      src?.email
    ),
    tag: firstTruthy(
      src?.payee?.tag,
      src?.toTag,
      src?.handle,
      src?.toHandle,
      src?.cashtag
    ),
    accountMasked: firstTruthy(
      src?.recipientAccountMasked,
      src?.beneficiary?.accountMasked,
      src?.payee?.accountRef,
      src?.accountMasked
    ),
    cryptoAddress,
    network: cryptoNetwork,
  };

  const etaText =
    src?.etaText ||
    src?.eta ||
    (t === "ach"
      ? "1–3 business days"
      : t === "ach_same_day"
      ? "Same day (cutoff dependent)"
      : t === "wire_domestic"
      ? "Same day before cutoff"
      : t === "wire_international"
      ? "1–3 business days (bank dependent)"
      : t === "card_instant"
      ? "Instant"
      : t === "crypto"
      ? "1–3 confirmations"
      : ["paypal", "wise", "revolut", "venmo", "zelle", "cashapp", "wechat", "alipay"].includes(
          t
        )
      ? "Usually instant"
      : undefined);

  return {
    status,
    type: t,
    railRaw: rawRail,
    cryptoKind,
    createdAt: src?.createdAt || new Date().toISOString(),
    etaText,
    amount: {
      value: asNumber(amountObj?.value ?? amountObj),
      currency: amountObj?.currency || "USD",
    },
    fees: {
      app: appFee != null ? asNumber(appFee) : undefined,
      network: netFee != null ? asNumber(netFee) : undefined,
      currency: feeCcy,
    },
    sender,
    recipient,
    referenceId:
      src?.referenceId ||
      src?.ref ||
      src?.id ||
      src?.transfer?.referenceId ||
      "TX-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    cancelable:
      typeof src?.cancelable === "boolean" ? src.cancelable : true,
    note: firstTruthy(src?.note, src?.memo, src?.reference, src?.description),
    cryptoAmount,
    cryptoSymbol: cryptoSymbolRaw
      ? String(cryptoSymbolRaw).toUpperCase()
      : undefined,
  };
}

/** Build from querystring when API/localStorage not available (dev fallback). */
function mapQueryToSummary(params: URLSearchParams): PendingSummary {
  const q = (k: string, d = "") => params.get(k) ?? d;
  const type = (q("type", "ach").toLowerCase() as RailType) || "ach";

  const defaultEta =
    q("eta") ||
    (type === "ach"
      ? "1–3 business days"
      : type === "ach_same_day"
      ? "Same day (cutoff dependent)"
      : type === "wire_domestic"
      ? "Same day before cutoff"
      : type === "wire_international"
      ? "1–3 business days (bank dependent)"
      : type === "card_instant"
      ? "Instant"
      : type === "crypto"
      ? "1–3 confirmations"
      : ["paypal", "wise", "revolut", "venmo", "zelle", "cashapp", "wechat", "alipay"].includes(
          type
        )
      ? "Usually instant"
      : undefined);

  const cryptoSymbolRaw = q("cryptoSymbol", "");
  const cryptoAmtRaw = q("cryptoAmount", "");
  const cryptoKindParam = q("cryptoKind", "").toLowerCase();

  return {
    status: q("status", "pending") as PendingStatus,
    type,
    railRaw: type,
    cryptoKind:
      type === "crypto" &&
      (cryptoKindParam === "buy" ||
        cryptoKindParam === "swap" ||
        cryptoKindParam === "send")
        ? (cryptoKindParam as "buy" | "swap" | "send")
        : undefined,
    createdAt: new Date().toISOString(),
    etaText: defaultEta,
    amount: {
      value: Number(q("amount", "0")) || 0,
      currency: q("ccy", "USD"),
    },
    fees: {
      app: q("fee") ? Number(q("fee")) : undefined,
      network: q("netFee") ? Number(q("netFee")) : undefined,
      currency: q("feeCcy", "USD"),
    },
    sender: {
      accountName: q("fromName", "Checking") || undefined,
      accountMasked: q("fromMask", "") || undefined,
    },
    recipient: {
      name: q("to", "") || undefined,
      email: q("email", "") || undefined,
      tag: q("tag", "") || undefined,
      cryptoAddress: q("addr", "") || undefined,
      accountMasked: q("acct", "") || undefined,
      network: q("net", "") || undefined,
    },
    referenceId:
      q("ref", "TX-" + Math.random().toString(36).slice(2, 8).toUpperCase()),
    cancelable: q("cancelable", "1") === "1",
    note: q("note", "") || undefined,
    cryptoAmount: cryptoAmtRaw ? Number(cryptoAmtRaw) : undefined,
    cryptoSymbol: cryptoSymbolRaw ? cryptoSymbolRaw.toUpperCase() : undefined,
  };
}

/* -------------------------------- component -------------------------------- */

export default function Pending() {
  const router = useRouter();
  const params = useSearchParams();

  const [userName, setUserName] = useState("User");
  const [setupPercent, setSetupPercent] = useState<number | undefined>(
    undefined
  );
  const [summary, setSummary] = useState<PendingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const ref = params.get("ref");
  const pollRef = useRef<number | null>(null);

  // bootstrap
  useEffect(() => {
    if (typeof window === "undefined") return;

    setUserName(localStorage.getItem("hb_user_name") || "User");
    const s = localStorage.getItem("hb_setup_percent");
    if (s) setSetupPercent(Number(s));

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        if (ref) {
          const server = await getPendingByRef(ref);
          setSummary(mapServerToSummary(server));
        } else {
          let ls: any = null;
          try {
            const raw = localStorage.getItem("last_transfer");
            if (raw) ls = JSON.parse(raw);
          } catch {}
          if (ls) setSummary(mapServerToSummary(ls));
          else setSummary(mapQueryToSummary(params as any));
        }
      } catch (e: any) {
        // fall back to ls/query if API fails
        let ls: any = null;
        try {
          const raw = localStorage.getItem("last_transfer");
          if (raw) ls = JSON.parse(raw);
        } catch {}
        if (ls) setSummary(mapServerToSummary(ls));
        else setSummary(mapQueryToSummary(params as any));
        setErr(e?.message || "Couldn’t load transfer details.");
      } finally {
        setLoading(false);
      }
    }

    load();

    // light polling while pending
    if (ref) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        try {
          const server = await getPendingByRef(ref);
          setSummary((prev) => {
            const next = mapServerToSummary(server);
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
          });
        } catch {
          /* ignore transient poll errors */
        }
      }, 6000) as unknown as number;
    }

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [ref, params]);

  // title/status
  const statusBadge = useMemo(() => {
    if (!summary)
      return {
        label: "Pending",
        icon: <Clock className="h-5 w-5 text-yellow-300" />,
      };
    if (summary.status === "completed")
      return {
        label: "Completed",
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
      };
    if (summary.status === "rejected")
      return {
        label: "Rejected",
        icon: <AlertTriangle className="h-5 w-5 text-rose-300" />,
      };
    if (summary.status === "scheduled")
      return {
        label: "Scheduled",
        icon: <Clock className="h-5 w-5 text-cyan-300" />,
      };
    if (summary.status === "processing")
      return {
        label: "Processing",
        icon: <Clock className="h-5 w-5 text-cyan-300" />,
      };
    return {
      label: "Pending",
      icon: <Clock className="h-5 w-5 text-yellow-300" />,
    };
  }, [summary]);

  const fmtMoney = (n?: number, c = "USD") =>
    typeof n === "number"
      ? n.toLocaleString(undefined, {
          style: "currency",
          currency: c,
        })
      : "—";

  // 🔹 Amount display: show "0.00 BTC • $X.XX" for crypto
  const amountDisplay = useMemo(() => {
    if (!summary) return "—";
    const fiat = fmtMoney(
      summary.amount?.value,
      summary.amount?.currency || "USD"
    );
    if (
      summary.type === "crypto" &&
      typeof summary.cryptoAmount === "number" &&
      summary.cryptoSymbol
    ) {
      return `${summary.cryptoAmount} ${summary.cryptoSymbol.toUpperCase()} • ${fiat}`;
    }
    return fiat;
  }, [summary]);

  const recipientPretty = useMemo(() => {
    if (!summary?.recipient) return "Recipient";
    return (
      summary.recipient.name ||
      summary.recipient.email ||
      summary.recipient.tag ||
      summary.recipient.cryptoAddress ||
      summary.recipient.accountMasked ||
      "Recipient"
    );
  }, [summary]);

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} setupPercent={setupPercent} />

      <section className="container-x pt-[120px] pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl border border-white/15 bg-white/[0.04] p-8 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
          {/* header */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 grid place-items-center">
              {statusBadge.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">
                {loading
                  ? "Loading…"
                  : `Transfer ${statusBadge.label}`}
              </h1>
              <p className="text-white/70 mt-1">
                {summary ? (
                  <>
                    Created{" "}
                    {new Date(summary.createdAt).toLocaleString()} • Ref:{" "}
                    <span className="font-mono">
                      {summary.referenceId}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="text-white/80 mt-2">
                {summary?.status === "rejected"
                  ? "This transfer was rejected."
                  : summary?.status === "completed"
                  ? "This transfer has completed."
                  : "This transfer is pending approval. You’ll get a notification when its status updates."}
              </p>
            </div>
          </div>

          {err && (
            <div className="mt-4 text-sm text-rose-300">{err}</div>
          )}

          {/* core info */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <Info label="Amount" value={amountDisplay} />
            <Info label="Recipient" value={recipientPretty} />
            <Info
              label="From account"
              value={
                summary?.sender?.accountMasked
                  ? `${summary?.sender?.accountName ?? "Account"} ${
                      summary?.sender?.accountMasked
                    }`
                  : summary?.sender?.accountName || "—"
              }
            />
            <Info
              label="Transfer rail"
              value={railLabel(
                summary?.type || "ach",
                summary?.recipient?.network
              )}
            />
          </div>

          {/* fees / eta */}
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <Info
              label="Fees"
              value={
                summary?.fees
                  ? (() => {
                      const app =
                        summary.fees.app != null
                          ? fmtMoney(
                              summary.fees.app,
                              summary.fees.currency || "USD"
                            )
                          : "—";
                      const net =
                        summary.fees.network != null
                          ? ` + network ${fmtMoney(
                              summary.fees.network,
                              summary.fees.currency || "USD"
                            )}`
                          : "";
                      return `${app}${net}`.trim();
                    })()
                  : "—"
              }
            />
            <Info label="ETA" value={summary?.etaText || "—"} />
          </div>

          {/* note */}
          {summary?.note && (
            <div className="mt-4 grid">
              <Info label="Note" value={summary.note} />
            </div>
          )}

          {/* crypto specifics */}
          {summary?.type === "crypto" &&
            (summary?.recipient?.cryptoAddress ||
              summary?.recipient?.network) && (
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                {summary.recipient.cryptoAddress && (
                  <Info
                    label="Destination address"
                    value={
                      <Copyable
                        text={summary.recipient.cryptoAddress}
                        display={maskAddr(
                          summary.recipient.cryptoAddress
                        )}
                      />
                    }
                  />
                )}
                {summary.recipient.network && (
                  <Info
                    label="Network"
                    value={summary.recipient.network}
                  />
                )}
              </div>
            )}

          <div className="mt-6 text-sm text-white/70 flex items-start gap-2">
            <ShieldQuestion size={16} className="mt-0.5" />
            <span>
              Some transfers may require additional checks. If more
              information is needed, we’ll reach out. You can close
              this page—your transfer will continue processing.
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
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

/* -------------------------------- UI bits -------------------------------- */

function Info({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-base font-medium break-words">
        {value ?? "—"}
      </div>
    </div>
  );
}

function maskAddr(a?: string) {
  if (!a) return "—";
  const s = String(a);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

function Copyable({ text, display }: { text: string; display?: string }) {
  async function cp() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }
  return (
    <button
      onClick={cp}
      className="inline-flex items-center gap-2 hover:underline"
    >
      <span className="font-mono">{display || text}</span>
      <Copy className="h-3.5 w-3.5 opacity-70" />
    </button>
  );
}
