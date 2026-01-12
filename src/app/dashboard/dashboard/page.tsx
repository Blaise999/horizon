// app/dashboard/page.tsx — Horizon (INTELLIGENT TXNS + INSIGHTS) — MOBILE-FIRST ARRANGEMENT
// - Cleaner mobile layout + better spacing + sticky section headers
// - Direction-aware counterparty resolution (origin vs beneficiary)
// - Deep fallbacks for name/handle/bank last4, incl. provider meta blocks
// - Provider names never appear as bold title; they live in subtitle only
// - Real 30d stats, YTD, cleaner UI
// - Avatar upload: Cloudinary unsigned → save to /users/me/profile → live preview (+ optional nav refresh event)

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  PiggyBank,
  BarChart3,
  Plus,
  CreditCard,
  Shield,
  Lock,
  X,
  Camera,
  Trash2,
  Save,
  Mail,
  Phone,
  User,
  MapPin,
  Bell,
  Bitcoin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import API, { request, uploadAvatarUnsigned, saveAvatar } from "@/libs/api";
import { useLiveCrypto } from "@/libs/useLiveCrypto";

/* -------------------------------------------------------------------------- */
/* Types (FE-only) */
/* -------------------------------------------------------------------------- */

type Address = {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type AccountsShape =
  | {
      accountNumber?: string;
      routingNumber?: string;
      cardNumber?: string;
      cardLast4?: string;
    }
  | null;

/** Unified Txn row (post-normalization) */
type TxnRowUnified = {
  id: string;
  date: string; // ISO
  amount: number; // signed USD (− sent / + received)
  account: "Checking" | "Savings" | "Crypto" | "Unknown";
  rail?: string;
  category: string;
  title: string; // human name/handle/address — never provider
  subtitle?: string; // handle/email/phone/acct or rail
  direction: "sent" | "received";
  note?: string;
  ref?: string;
  crypto?: {
    symbol: string;
    amount: number; // coin units (positive)
    usdAtExecution: number;
    side: "buy" | "sell" | "receive" | "send";
  };
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatAddress(a?: Address) {
  if (!a) return "";
  const cityState = [a.city, a.state].filter(Boolean).join(", ");
  return [a.street1, a.street2, cityState, a.postalCode, a.country]
    .filter(Boolean)
    .join(" • ");
}

function addressToString(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "object") {
    // Could be AddressSchema or something similar
    const s = formatAddress(v as Address);
    return s || undefined;
  }
  return String(v).trim() || undefined;
}

function num(v: any, def = 0): number {
  if (v == null) return def;
  if (typeof v === "number") return isFinite(v) ? v : def;
  if (typeof v === "string") {
    const n = Number(v);
    return isFinite(n) ? n : def;
  }
  if (typeof v === "object" && v.$numberDecimal) {
    const n = Number(v.$numberDecimal);
    return isFinite(n) ? n : def;
  }
  return def;
}

function firstNonEmpty(...vals: any[]): string | undefined {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

const uuid = () =>
  typeof crypto !== "undefined" &&
  typeof (crypto as any).randomUUID === "function"
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2);

/* -------------------------------------------------------------------------- */
/* Rail beautifier + provider detection                                       */
/* -------------------------------------------------------------------------- */

const RAIL_LABELS: Record<string, string> = {
  paypal: "PayPal",
  zelle: "Zelle",
  venmo: "Venmo",
  revolut: "Revolut",
  wise: "Wise",
  cashapp: "Cash App",
  wire_domestic: "Wire",
  wire_international: "Wire",
  ach: "ACH",
  ach_domestic: "ACH",
  crypto: "Crypto",
  crypto_send: "Crypto",
  crypto_receive: "Crypto",
  card: "Card",
  internal: "Internal",
};
function prettyRail(s?: string) {
  if (!s) return undefined;
  const key = s.toLowerCase().replace(/-/g, "_");
  return RAIL_LABELS[key] || s;
}

const PROVIDER_ALIASES = new Set<string>([
  ...Object.keys(RAIL_LABELS).map((k) => k.toLowerCase()),
  ...Object.values(RAIL_LABELS).map((v) => v.toLowerCase()),
  "wire",
  "wire transfer",
  "ach transfer",
  "ach domestic",
  "card",
  "transfer",
  "internal",
  "cashapp",
  "cash app",
  "cryptocurrency",
  "crypto",
]);
function isProviderLabel(s?: string) {
  if (!s) return false;
  const x = s.trim().toLowerCase();
  return PROVIDER_ALIASES.has(x);
}

/* Maskers / prettifiers for handles */
function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/[_\-]+/g, " ");
}
function prettifyEmailLocal(email?: string) {
  if (!email) return undefined;
  const m = String(email).split("@")[0];
  if (!m) return undefined;
  return titleCase(m.replace(/\./g, " "));
}
function maskPhone(phone?: string) {
  if (!phone) return undefined;
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return undefined;
  return `•••${d.slice(-4)}`;
}
function maskAddr(addr?: string) {
  if (!addr) return undefined;
  const s = String(addr).trim();
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

/* -------------------------------------------------------------------------- */
/* Totals                                                                     */
/* -------------------------------------------------------------------------- */
function totalsLastNDays(rows: TxnRowUnified[], days = 30) {
  const start = Date.now() - days * 24 * 60 * 60 * 1000;
  let sent = 0,
    received = 0;
  for (const r of rows) {
    const ts = new Date(r.date).getTime();
    if (!Number.isFinite(ts) || ts < start) continue;
    const a = Number(r.amount) || 0;
    if (a < 0) sent += -a;
    else received += a;
  }
  return {
    sent: +sent.toFixed(2),
    received: +received.toFixed(2),
    net: +(received - sent).toFixed(2),
  };
}

/* -------------------------------------------------------------------------- */
/* Direction-aware counterparty picker                                        */
/* -------------------------------------------------------------------------- */
function pickParty(input: any, direction: "sent" | "received") {
  const sender =
    input?.origin ??
    input?.from ??
    input?.sender ??
    input?.meta?.origin ??
    input?.meta?.from;

  const receiver =
    input?.beneficiary ??
    input?.to ??
    input?.recipient ??
    input?.meta?.beneficiary ??
    input?.meta?.to ??
    input?.meta?.recipient;

  const party = direction === "sent" ? receiver : sender;

  const partyName = firstNonEmpty(
    party?.name,
    input?.counterpartyName,
    input?.displayName,
    input?.payee,
    input?.payer,
    input?.contactName,
    input?.meta?.counterpartyName,
    input?.meta?.toName,
    input?.meta?.fromName,
    input?.meta?.beneficiaryName,
    input?.meta?.originName,
    input?.meta?.name,
    input?.merchant
  );

  const partyHandle = firstNonEmpty(
    party?.wallet?.handle,
    party?.email,
    party?.phone,
    input?.recipient?.handle,
    input?.recipient?.tag,
    input?.recipient?.email,
    input?.recipient?.phone,
    input?.meta?.recipient?.handle,
    input?.meta?.recipient?.tag,
    input?.meta?.recipient?.email,
    input?.meta?.recipient?.phone,
    // provider blocks:
    input?.meta?.paypal?.email,
    input?.meta?.venmo?.handle,
    input?.meta?.cashapp?.cashtag,
    input?.meta?.revolut?.name,
    input?.meta?.wise?.name
  );

  const partyAddressRaw = firstNonEmpty(
    party?.cryptoAddress,
    addressToString(party?.address),
    input?.recipient?.cryptoAddress,
    addressToString(input?.recipient?.address),
    input?.crypto?.toAddress,
    input?.crypto?.address,
    input?.meta?.crypto?.toAddress,
    input?.meta?.crypto?.address,
    input?.meta?.cryptoTo,
    input?.meta?.toAddress,
    input?.meta?.to,
    input?.meta?.destinationAddress,
    input?.toAddress,
    input?.address
  );

  const bankLast4 = firstNonEmpty(
    party?.bank?.last4,
    input?.bank?.last4,
    input?.meta?.bank?.last4,
    input?.meta?.bank?.iban,
    input?.meta?.bank?.pan,
    input?.meta?.bank?.account
  );

  return {
    partyName,
    partyHandle,
    bankLast4,
    partyAddress: partyAddressRaw,
  };
}

/* -------------------------------------------------------------------------- */
/* Normalizer                                                                 */
/* -------------------------------------------------------------------------- */
function normalizeTx(input: any): TxnRowUnified | null {
  // 1) Amount / direction
  const rawAmt =
    input?.amount?.value ??
    input?.amountValue ??
    input?.amount ??
    input?.meta?.amount ??
    0;
  const amt = num(rawAmt);

  let direction: "sent" | "received";
  if (typeof input?.direction === "string") {
    const d = String(input.direction).toLowerCase();
    direction = d === "credit" || d === "received" ? "received" : "sent";
  } else {
    direction = amt < 0 ? "sent" : "received";
  }

  // Store signed USD (− sent / + received)
  const signed = direction === "sent" ? -Math.abs(amt) : Math.abs(amt);

  // 2) Rail
  const rail =
    (input?.rail as string | undefined) ||
    (input?.meta?.rail as string | undefined);

  // 3) Counterparty (direction-aware)
  const { partyName, partyHandle, bankLast4, partyAddress } = pickParty(
    input,
    direction
  );

  const nameHuman =
    partyName && !isProviderLabel(partyName) ? partyName : undefined;

  // Handle/email/phone prettification
  let handle = partyHandle;
  if (!nameHuman && handle && /@/.test(handle)) {
    handle = prettifyEmailLocal(handle) || handle;
  }
  if (!nameHuman && handle && /^\+?[\d\s().-]+$/.test(handle)) {
    handle = maskPhone(handle) || handle;
  }

  const last4 = bankLast4 ? String(bankLast4).slice(-4) : undefined;

  let addressMasked = partyAddress ? maskAddr(partyAddress) : undefined;

  // 4) Title (never provider/rail)
  const merchantRaw =
    (input?.merchant && String(input.merchant).trim()) || undefined;
  const merchantHuman =
    merchantRaw && !isProviderLabel(merchantRaw) ? merchantRaw : undefined;

  let title =
    nameHuman ||
    merchantHuman ||
    (handle && !isProviderLabel(handle) ? handle : undefined) ||
    addressMasked ||
    (last4 ? `Acct ••••${last4}` : "Unknown");

  // 5) Subtitle — prefer a different signal from title
  const railPretty = prettyRail(rail);

  let subtitle: string | undefined =
    nameHuman && handle
      ? handle
      : !nameHuman && last4 && title !== `Acct ••••${last4}`
      ? `Acct ••••${last4}`
      : addressMasked && addressMasked !== title
      ? addressMasked
      : railPretty;

  if (
    subtitle &&
    subtitle.trim().toLowerCase() === title.trim().toLowerCase()
  ) {
    subtitle =
      railPretty && railPretty.toLowerCase() !== title.toLowerCase()
        ? railPretty
        : undefined;
  }

  // If title is still "Unknown" on crypto rail, force address-based title
  if (
    title === "Unknown" &&
    rail &&
    String(rail).toLowerCase().startsWith("crypto")
  ) {
    const addr = partyAddress;
    const masked = addr ? maskAddr(addr) : undefined;
    if (masked) {
      title = masked;
      if (!subtitle || isProviderLabel(subtitle)) subtitle = railPretty;
    }
  }

  // 6) Account kind
  const railLower = rail ? String(rail).toLowerCase() : "";
  const account: TxnRowUnified["account"] =
    (input?.accountType as any) ||
    (railLower &&
    [
      "crypto",
      "crypto_buy",
      "crypto_swap",
      "crypto_send",
      "crypto_receive",
    ].includes(railLower)
      ? "Crypto"
      : "Checking");

  // 7) Crypto mirror
  const cryptoRow = input?.crypto || input?.meta?.crypto;
  const crypto =
    cryptoRow && {
      symbol: cryptoRow.symbol || "BTC",
      amount: Math.abs(num(cryptoRow.amount ?? cryptoRow.qty)),
      usdAtExecution: num(cryptoRow.usdAtExecution ?? cryptoRow.price),
      side:
        (cryptoRow.side as any) ||
        (cryptoRow.direction as any) ||
        (direction === "sent" ? "send" : "receive"),
    };

  // 8) Refs & notes
  const ref =
    input?.ref ||
    input?.referenceId ||
    input?.provider?.requestId ||
    input?.meta?.reference ||
    input?.meta?.ref;

  const note = input?.note || input?.memo || input?.meta?.note;

  // 9) Date / ID
  const date =
    input?.date ||
    input?.createdAt ||
    input?.meta?.createdAt ||
    new Date().toISOString();
  const id = String(input?.id || input?._id || input?.referenceId || uuid());

  return {
    id,
    date: String(date),
    amount: +Number(signed).toFixed(2),
    account: (account as any) || "Unknown",
    rail,
    category: String(input?.category || "Transfer"),
    title,
    subtitle,
    direction,
    note,
    ref,
    crypto,
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregations for Insights (monthly + YTD) */
/* -------------------------------------------------------------------------- */
type MonthKey = `${number}-${number}`;
function toMonthKey(d: Date): MonthKey {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}` as MonthKey;
}
function aggregateByMonth(rows: TxnRowUnified[]) {
  const map = new Map<MonthKey, { sent: number; received: number }>();
  for (const r of rows) {
    const d = new Date(r.date);
    const k = toMonthKey(d);
    const cur = map.get(k) || { sent: 0, received: 0 };
    if (r.amount < 0) cur.sent += Math.abs(r.amount);
    else cur.received += r.amount;
    map.set(k, cur);
  }
  return map;
}
function aggregateYtd(rows: TxnRowUnified[], ref = new Date()) {
  const year = ref.getUTCFullYear();
  let sent = 0,
    received = 0;
  for (const r of rows) {
    const d = new Date(r.date);
    if (d.getUTCFullYear() !== year) continue;
    if (r.amount < 0) sent += Math.abs(r.amount);
    else received += r.amount;
  }
  return { sent: +sent.toFixed(2), received: +received.toFixed(2) };
}

/* -------------------------------------------------------------------------- */
/* Money formatters                                                           */
/* -------------------------------------------------------------------------- */
const USD0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const USD2 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
function fmtUsd(v: number, compact = false) {
  const n = Number(v) || 0;
  if (compact && Math.abs(n) >= 1000) return USD0.format(n);
  return USD2.format(n);
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */
export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState<string>("");
  const [setupPercent, setSetupPercent] = useState<number>(0);
  const [checkingBalance, setCheckingBalance] = useState<number>(0);
  const [savingsBalance, setSavingsBalance] = useState<number>(0);

  // BTC anchor (for legacy fallback)
  const [btcAmountBase, setBtcAmountBase] = useState<number>(0);

  // All crypto holdings by asset id (coin units)
  const [cryptoHoldings, setCryptoHoldings] = useState<Record<string, number>>(
    {}
  );

  const [accountNumber, setAccountNumber] = useState<string>("");
  const [routingNumber, setRoutingNumber] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardLast4, setCardLast4] = useState<string>("");

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileFirst, setProfileFirst] = useState<string>("");
  const [profileLast, setProfileLast] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [profileHandle, setProfileHandle] = useState<string>("");
  const [profileAddress, setProfileAddress] = useState<string>("");

  const [notifyEmail, setNotifyEmail] = useState<boolean>(true);
  const [notifyPush, setNotifyPush] = useState<boolean>(false);
  const [currency, setCurrency] = useState<string>("USD");
  const [timezone, setTimezone] = useState<string>("America/New_York");

  const [showAccounts, setShowAccounts] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [txns, setTxns] = useState<TxnRowUnified[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [focusMonth, setFocusMonth] = useState<Date>(new Date());

  // Avatar UX flags
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const openQuickAddMoney = () => router.push("/Transfer/add");
  const openQuickTransfer = () => router.push("/Transfer/transfermethod");
  const openPayBills = () => router.push("/Transfer/paybill");
  const openCardsManager = () => setShowAccounts(true);
  const openInsights = () => setShowAnalytics(true);
  const openTransactions = () => setShowTransactions(true);
  const openCrypto = () => router.push("/Transfer/crypto");

  useEffect(() => {
    (async () => {
      try {
        const meResp = await API.me();
        const { user, preferences: prefsTop } = meResp as any;

        const name =
          (user.fullName && user.fullName.trim()) ||
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          (user.email ? user.email.split("@")[0] : "") ||
          "User";

        setUserName(name);
        setProfileFirst(user.firstName || "");
        setProfileLast(user.lastName || "");
        setProfileEmail(user.email || "");
        setProfilePhone(user.phone || "");
        setProfileAvatar(user.avatarUrl ?? null);
        setProfileAddress(formatAddress(user.address));
        setSetupPercent(Number(user.setupPercent || 0));

        const prefs = prefsTop || user.preferences || {};
        setNotifyEmail(!!prefs.notifyEmail);
        setNotifyPush(!!prefs.notifyPush);
        setCurrency(prefs.currency || "USD");
        setTimezone(prefs.timezone || "America/New_York");
        setProfileHandle(user.handle || "");

        setCheckingBalance(Number(user.balances?.checking || 0));
        setSavingsBalance(Number(user.balances?.savings || 0));

        // Build holdings from per-coin user.balances fields
        const balances = user.balances || {};
        const holdings: Record<string, number> = {};

        const addHolding = (id: string, raw: any) => {
          const n = Number(raw ?? 0);
          if (Number.isFinite(n) && n > 0) holdings[id] = n;
        };

        addHolding("bitcoin", balances.cryptoBTC);
        addHolding("ethereum", balances.cryptoETH);
        addHolding("usd-coin", balances.cryptoUSDC);
        addHolding("tether", balances.cryptoUSDT);
        addHolding("solana", balances.cryptoSOL);
        addHolding("litecoin", balances.cryptoLTC);
        addHolding("ripple", balances.cryptoXRP);
        addHolding("cardano", balances.cryptoADA);
        addHolding("binancecoin", balances.cryptoBNB);
        addHolding("dogecoin", balances.cryptoDOGE);

        const legacyHoldings = balances.cryptoHoldings;
        if (legacyHoldings && typeof legacyHoldings === "object") {
          Object.entries(legacyHoldings).forEach(([id, val]) => {
            const amount =
              typeof val === "object" && val !== null
                ? Number((val as any).amount ?? 0)
                : Number(val as any);
            addHolding(id, amount);
          });
        }

        // Legacy BTC fallback using cryptoUSD / btcPrice
        const legacyUsd = Number(balances.cryptoUSD ?? 0);
        const legacyPx = Number((balances.btcPrice as any) ?? 0);
        const baseFromLegacy =
          legacyUsd > 0 && legacyPx > 0 ? legacyUsd / legacyPx : 0;
        if (!holdings.bitcoin && baseFromLegacy > 0) {
          holdings.bitcoin = baseFromLegacy;
        }

        setCryptoHoldings(holdings);
        setBtcAmountBase(holdings.bitcoin || 0);

        const accts = user.accounts as AccountsShape;
        if (accts) {
          setAccountNumber(accts.accountNumber || "");
          setRoutingNumber(accts.routingNumber || "");
          setCardNumber(accts.cardNumber || "");
          setCardLast4(accts.cardLast4 || "");
        }

        // Txns
        try {
          const tx = await request<{ items: any[] }>("/users/me/txns");
          const raw = Array.isArray(tx?.items) ? tx.items : [];
          const normalized = raw
            .map((row) => normalizeTx(row))
            .filter(Boolean) as TxnRowUnified[];
          normalized.sort((a, b) => +new Date(b.date) - +new Date(a.date));
          setTxns(normalized);
        } catch (e) {
          console.warn("txns fetch error", e);
        }

        // Notifications / activities
        try {
          const acts = await request<{ items: any[] }>("/users/me/activities");
          const list = Array.isArray(acts?.items) ? acts.items : [];
          if (list.length) {
            setActivities(
              list.sort(
                (a, b) =>
                  new Date(b.createdAt || 0).getTime() -
                  new Date(a.createdAt || 0).getTime()
              )
            );
          }
        } catch {
          // ignore
        }
      } catch {
        router.replace("/dashboard/loginpage");
      }
    })();
  }, [router]);

  const totalFiat = useMemo(
    () => checkingBalance + savingsBalance,
    [checkingBalance, savingsBalance]
  );

  const assetIds = useMemo(() => Object.keys(cryptoHoldings), [cryptoHoldings]);

  const { perAsset, loading: priceLoading } = useLiveCrypto({
    ids: assetIds.length ? assetIds : ["bitcoin"],
    amounts: assetIds.length ? cryptoHoldings : { bitcoin: btcAmountBase },
    pollMs: 15000,
  });

  const totalCryptoUsd = useMemo(() => {
    if (!perAsset) return 0;
    return Object.values(perAsset).reduce((sum, asset: any) => {
      const v = Number(asset?.usdValue ?? 0);
      return Number.isFinite(v) ? sum + v : sum;
    }, 0);
  }, [perAsset]);

  const portfolioChange24h = useMemo(() => {
    if (!perAsset) return null;
    if (!totalCryptoUsd) return null;

    let weighted = 0;
    let hasAny = false;

    Object.values(perAsset).forEach((asset: any) => {
      const value = Number(asset?.usdValue ?? 0);
      const pct = Number(asset?.change24h);
      if (!Number.isFinite(value) || value <= 0) return;
      if (!Number.isFinite(pct)) return;
      const weight = value / totalCryptoUsd;
      weighted += weight * pct;
      hasAny = true;
    });

    if (!hasAny) return null;
    return weighted;
  }, [perAsset, totalCryptoUsd]);

  const totalAssets = totalFiat + totalCryptoUsd;

  const byMonth = useMemo(() => aggregateByMonth(txns), [txns]);
  const ytd = useMemo(() => aggregateYtd(txns), [txns]);
  const last30 = useMemo(() => totalsLastNDays(txns, 30), [txns]);

  const monthlyTrend = useMemo(() => {
    const points: { label: string; net: number; ts: number }[] = [];
    byMonth.forEach((val, key) => {
      const [yStr, mStr] = key.split("-");
      const year = Number(yStr);
      const month = Number(mStr);
      const d = new Date(Date.UTC(year, month - 1, 1));
      const label = d.toLocaleString(undefined, { month: "short" });
      const net = +(val.received - val.sent).toFixed(2);
      points.push({ label, net, ts: d.getTime() });
    });
    points.sort((a, b) => a.ts - b.ts);
    return points.slice(-6).map(({ label, net }) => ({ label, net }));
  }, [byMonth]);

  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    txns.forEach((t) => {
      const cat = (t.category || "Other").trim();
      const vol = Math.abs(t.amount);
      if (!vol) return;
      map.set(cat, (map.get(cat) || 0) + vol);
    });
    const arr: { category: string; total: number }[] = [];
    map.forEach((total, category) => {
      arr.push({ category, total: +total.toFixed(2) });
    });
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [txns]);

  const railSummary = useMemo(() => {
    const map = new Map<string, { sent: number; received: number }>();
    txns.forEach((t) => {
      const key = prettyRail(t.rail) ?? "Other";
      const cur = map.get(key) || { sent: 0, received: 0 };
      if (t.amount < 0) cur.sent += Math.abs(t.amount);
      else cur.received += t.amount;
      map.set(key, cur);
    });
    const arr: {
      rail: string;
      total: number;
      sent: number;
      received: number;
    }[] = [];
    map.forEach((v, rail) => {
      const total = v.sent + v.received;
      arr.push({
        rail,
        total: +total.toFixed(2),
        sent: +v.sent.toFixed(2),
        received: +v.received.toFixed(2),
      });
    });
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [txns]);

  const totalCategoryVolume = useMemo(
    () => categorySummary.reduce((sum, c) => sum + c.total, 0),
    [categorySummary]
  );
  const totalRailVolume = useMemo(
    () => railSummary.reduce((sum, r) => sum + r.total, 0),
    [railSummary]
  );

  const monthSentRecv = useMemo(() => {
    const k = toMonthKey(focusMonth);
    const row = byMonth.get(k) || { sent: 0, received: 0 };
    return { ...row, net: +(row.received - row.sent).toFixed(2) };
  }, [byMonth, focusMonth]);

  function prevMonth() {
    const d = new Date(focusMonth);
    d.setUTCMonth(d.getUTCMonth() - 1);
    setFocusMonth(d);
  }
  function nextMonth() {
    const d = new Date(focusMonth);
    d.setUTCMonth(d.getUTCMonth() + 1);
    setFocusMonth(d);
  }

  const monthLabel = useMemo(
    () =>
      focusMonth.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [focusMonth]
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  function handlePickAvatar() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const url = await uploadAvatarUnsigned(file, {
        folder: "horizon/avatars",
      });
      await saveAvatar(url);
      setProfileAvatar(url);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("horizon:profile-updated", {
            detail: { avatarUrl: url },
          })
        );
        try {
          localStorage.setItem("horizon_avatar_url", url);
        } catch {}
      }
    } catch (err: any) {
      console.error("avatar upload failed", err);
      setAvatarError(err?.message || "Failed to upload avatar.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      await API.updateProfile({ avatarUrl: "" });
      setProfileAvatar(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("horizon:profile-updated", {
            detail: { avatarUrl: "" },
          })
        );
        try {
          localStorage.removeItem("horizon_avatar_url");
        } catch {}
      }
    } catch (err: any) {
      console.error("remove avatar failed", err);
      setAvatarError(err?.message || "Failed to remove photo.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await API.updateProfile({
        firstName: profileFirst,
        lastName: profileLast,
        address: { street1: profileAddress },
        avatarUrl: profileAvatar || undefined,
      });
      await API.updatePreferences({
        timezone,
        currency,
        notifyEmail,
        notifyPush,
      });
      const meResp = await API.me();
      const { user } = meResp as any;
      const name =
        (user.fullName && user.fullName.trim()) ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        (user.email ? user.email.split("@")[0] : "") ||
        "User";
      setUserName(name);
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  }

  function handleOpenTxn(t: TxnRowUnified) {
    const ref = t.ref || t.id;

    if (typeof window !== "undefined" && ref) {
      try {
        const payload = {
          referenceId: ref,
          amount: { value: Math.abs(t.amount), currency: "USD" },
          sender: { accountName: t.account },
          recipient: { name: t.title },
          note: t.note,
        };
        localStorage.setItem("last_transfer", JSON.stringify(payload));
      } catch {
        // ignore
      }
    }

    const params = new URLSearchParams();
    if (ref) params.set("ref", ref);
    router.push(`/Transfer/success?${params.toString()}`);
  }

  const visualCardLast4 = last4FromCard(cardNumber, cardLast4);

  const hasNotifs = activities?.length > 0;

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav
        userName={userName}
        setupPercent={setupPercent}
        onOpenCardsManager={openCardsManager}
        onOpenInsights={openInsights}
        onOpenTransactions={openTransactions}
        onOpenGoals={() => setShowAnalytics(true)}
        onOpenRecurring={() => setShowAnalytics(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenSupport={() => setShowSettings(true)}
        onOpenProfile={() => setShowSettings(true)}
        {...({ avatarUrl: profileAvatar || undefined } as any)}
      />

      {/* HERO */}
      <section className="pt-[88px] sm:pt-[100px] container-x">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#101826]/80 to-[#0B0F14]/80 p-6 sm:p-8 shadow-2xl backdrop-blur-lg ring-1 ring-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm text-white/60">
                  Welcome back,
                </div>
                <div className="text-xl sm:text-2xl font-semibold mt-1 truncate">
                  {userName || "User"}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Chip label="Fiat" value={fmtUsd(totalFiat, true)} />
                  <Chip
                    label="Crypto"
                    value={priceLoading ? "…" : fmtUsd(totalCryptoUsd, true)}
                  />
                  <Chip
                    label="30d net"
                    value={fmtUsd(last30.net, true)}
                    tone={last30.net >= 0 ? "pos" : "neg"}
                  />
                  {typeof portfolioChange24h === "number" &&
                    isFinite(portfolioChange24h) && (
                      <Chip
                        label="24h"
                        value={`${portfolioChange24h >= 0 ? "▲" : "▼"} ${Math.abs(
                          portfolioChange24h
                        ).toFixed(2)}%`}
                        tone={portfolioChange24h >= 0 ? "pos" : "neg"}
                      />
                    )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="shrink-0 h-11 w-11 rounded-2xl overflow-hidden bg-white/10 border border-white/20 grid place-items-center hover:bg-white/15 transition-all"
                title="Profile & settings"
              >
                {profileAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileAvatar}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white/55" />
                )}
              </button>
            </div>

            <div className="mt-6">
              <div className="text-xs sm:text-sm text-white/70">
                Total assets
              </div>
              <div className="text-4xl sm:text-5xl font-bold mt-1 tracking-tight tabular-nums">
                {fmtUsd(totalAssets, true)}
              </div>
              <div className="text-xs text-white/50 mt-2">
                Combined balances across fiat and crypto accounts.
              </div>
            </div>

            <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              <PrimaryButton onClick={openQuickTransfer} kind="primary">
                <ArrowUpRight size={14} /> Transfer
              </PrimaryButton>
              <PrimaryButton onClick={openQuickAddMoney}>
                <Plus size={14} /> Add money
              </PrimaryButton>
              <PrimaryButton onClick={openInsights}>
                <BarChart3 size={14} /> Insights
              </PrimaryButton>
              <PrimaryButton onClick={openTransactions}>
                <ArrowRight size={14} /> Activity
              </PrimaryButton>
            </div>
          </div>

          {/* ACCOUNTS — carousel on mobile, grid on desktop */}
          <div className="sm:hidden">
            <div className="text-sm text-white/70 mb-3">Accounts</div>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
              <div className="snap-center min-w-[280px]">
                <AccountCard
                  label="Checking"
                  balance={checkingBalance}
                  color="#00E0FF"
                  icon={<Wallet size={22} />}
                  subtitle="Everyday spending"
                  onClick={openCardsManager}
                />
              </div>
              <div className="snap-center min-w-[280px]">
                <AccountCard
                  label="Savings"
                  balance={savingsBalance}
                  color="#33D69F"
                  icon={<PiggyBank size={22} />}
                  subtitle="4.5% APY"
                  onClick={openCardsManager}
                />
              </div>
              <div className="snap-center min-w-[280px]">
                <CryptoCard
                  label="Crypto"
                  color="#F7931A"
                  icon={<Bitcoin size={22} />}
                  totalUsd={totalCryptoUsd}
                  change24h={portfolioChange24h ?? undefined}
                  assetsCount={assetIds.length}
                  loading={priceLoading}
                  onClick={openCrypto}
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-3 gap-4">
            <AccountCard
              label="Checking"
              balance={checkingBalance}
              color="#00E0FF"
              icon={<Wallet size={24} />}
              subtitle="Everyday spending account"
              onClick={openCardsManager}
            />
            <AccountCard
              label="Savings"
              balance={savingsBalance}
              color="#33D69F"
              icon={<PiggyBank size={24} />}
              subtitle="4.5% APY"
              onClick={openCardsManager}
            />
            <CryptoCard
              label="Crypto"
              color="#F7931A"
              icon={<Bitcoin size={24} />}
              totalUsd={totalCryptoUsd}
              change24h={portfolioChange24h ?? undefined}
              assetsCount={assetIds.length}
              loading={priceLoading}
              onClick={openCrypto}
            />
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS — 2x2 on mobile, row on desktop */}
      <section className="container-x mt-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-white/70">Quick actions</div>
            <button
              onClick={() => setShowNotifications(true)}
              className="text-xs text-white/60 hover:text-white/80 inline-flex items-center gap-2"
            >
              <Bell size={14} />
              Notifications
              {hasNotifs && (
                <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ActionTile
              icon={<ArrowUpRight size={26} />}
              label="Transfer"
              onClick={openQuickTransfer}
            />
            <ActionTile
              icon={<Plus size={26} />}
              label="Add money"
              onClick={openQuickAddMoney}
            />
            <ActionTile
              icon={<CreditCard size={26} />}
              label="Pay bills"
              onClick={openPayBills}
            />
            <ActionTile
              icon={<BarChart3 size={26} />}
              label="Insights"
              onClick={openInsights}
            />
          </div>
        </div>
      </section>

      {/* INSIGHTS GLANCE */}
      <section className="container-x mt-8">
        <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg shadow-2xl ring-1 ring-white/5">
          <div className="flex items-start sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold">Spending &amp; income</h2>
              <p className="text-xs text-white/55 mt-1">
                Month view for deeper context — last 30d summary stays accurate
                no matter what month you view.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                onClick={prevMonth}
                className="px-2 py-1 rounded-full bg-white/10 border border-white/20 hover:bg-white/15"
                title="Previous month"
              >
                ‹
              </button>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                <Calendar className="h-3 w-3 opacity-70" />
                <span>{monthLabel}</span>
              </div>
              <button
                onClick={nextMonth}
                className="px-2 py-1 rounded-full bg-white/10 border border-white/20 hover:bg-white/15"
                title="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <InsightStat
              label="Sent (this month)"
              value={fmtMoney(monthSentRecv.sent)}
              trend="Total outflows this month"
            />
            <InsightStat
              label="Received (this month)"
              value={fmtMoney(monthSentRecv.received)}
              trend="Total inflows this month"
            />
            <InsightStat
              label="Net (this month)"
              value={fmtMoney(monthSentRecv.net)}
              trend={monthSentRecv.net >= 0 ? "Net positive" : "Net negative"}
              positive={monthSentRecv.net >= 0}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <SummaryCard
              label="Sent (last 30d)"
              value={fmtMoney(last30.sent)}
              tone="sent"
            />
            <SummaryCard
              label="Received (last 30d)"
              value={fmtMoney(last30.received)}
              tone="received"
            />
            <SummaryCard label="Net (last 30d)" value={fmtMoney(last30.net)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <StatCard k="YTD Sent" v={fmtMoney(ytd.sent)} sub="Year-to-date outflows" />
            <StatCard
              k="YTD Received"
              v={fmtMoney(ytd.received)}
              sub="Year-to-date inflows"
            />
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-white/70">Monthly net trend</div>
              {monthlyTrend.length > 0 && (
                <div className="text-[11px] text-white/50">
                  Last {monthlyTrend.length} months
                </div>
              )}
            </div>
            <MiniTrendChart points={monthlyTrend} />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={openInsights}
              className="text-sm text-[#00E0FF] hover:underline inline-flex items-center gap-2"
            >
              Open full insights <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="container-x mt-8 pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <button
              onClick={openTransactions}
              className="text-sm text-[#00E0FF] hover:underline flex items-center gap-2 transition-all"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] divide-y divide-white/10 shadow-2xl ring-1 ring-white/5 overflow-hidden">
            {txns.length === 0 ? (
              <div className="p-10 text-center text-white/70">
                No transactions yet.
              </div>
            ) : (
              txns.slice(0, 7).map((t) => (
                <TxnRow key={t.id} t={t} onClick={() => handleOpenTxn(t)} />
              ))
            )}
          </div>

          {/* Bottom CTA strip for mobile */}
          <div className="sm:hidden mt-4 grid grid-cols-2 gap-3">
            <PrimaryButton onClick={openQuickTransfer} kind="primary">
              <ArrowUpRight size={14} /> Transfer
            </PrimaryButton>
            <PrimaryButton onClick={openQuickAddMoney}>
              <Plus size={14} /> Add money
            </PrimaryButton>
          </div>
        </div>
      </section>

      {/* Floating Notifications button (mobile-friendly) */}
      <button
        onClick={() => setShowNotifications(true)}
        title="Notifications"
        className="fixed right-4 bottom-4 z-[70] h-12 w-12 rounded-full bg-white/10 border border-white/20 grid place-items-center shadow-2xl hover:bg-white/15 transition-all"
      >
        <div className="relative">
          <Bell size={18} />
          {hasNotifs && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0E131B]" />
          )}
        </div>
      </button>

      {/* ----------------------------- MODALS ----------------------------- */}
      <Sheet open={showAccounts} onClose={() => setShowAccounts(false)} title="Accounts">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <InfoRow icon={<Wallet size={18} />} label="Checking" value={fmtUsd(checkingBalance, true)} />
            <InfoRow icon={<PiggyBank size={18} />} label="Savings" value={fmtUsd(savingsBalance, true)} />
            <InfoRow icon={<Bitcoin size={18} />} label="Crypto" value={priceLoading ? "…" : fmtUsd(totalCryptoUsd, true)} />
          </div>

          <div className="h-px bg-white/20 my-2" />

          <div className="grid lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] gap-4">
            <VirtualCard
              label="Horizon virtual card"
              holder={userName}
              last4={visualCardLast4}
              network="Visa"
            />
            <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-xs uppercase tracking-wide text-white/60 mb-3">
                Account details
              </div>
              <KeyVal k="Routing number" v={routingNumber || "—"} />
              <KeyVal k="Account number" v={maskAccount(accountNumber) || "—"} />
              <KeyVal
                k="Virtual card"
                v={visualCardLast4 ? `•••• •••• •••• ${visualCardLast4}` : "—"}
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <PrimaryButton onClick={openCrypto}>
              <Bitcoin size={16} /> Manage crypto
            </PrimaryButton>
            <PrimaryButton onClick={() => setShowSecurity(true)}>
              <Shield size={16} /> Security
            </PrimaryButton>
          </div>
        </div>
      </Sheet>

      <Sheet open={showTransactions} onClose={() => setShowTransactions(false)} title="Transactions">
        <TransactionsPanel txns={txns} onOpenTxn={handleOpenTxn} />
      </Sheet>

      <Sheet open={showAnalytics} onClose={() => setShowAnalytics(false)} title="Spending insights">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <StatCard k="This month sent" v={fmtMoney(monthSentRecv.sent)} sub="Outflows this month" />
            <StatCard
              k="This month received"
              v={fmtMoney(monthSentRecv.received)}
              sub="Inflows this month"
            />
            <StatCard k="YTD net" v={fmtMoney(ytd.received - ytd.sent)} sub="Income − spend" />

            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-base text-white/80 mb-3 font-semibold">
                Top categories
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                {categorySummary.slice(0, 4).length === 0 ? (
                  <li className="text-xs text-white/50">No categorized spend yet.</li>
                ) : (
                  categorySummary.slice(0, 4).map((c) => {
                    const pct =
                      totalCategoryVolume > 0
                        ? (c.total / totalCategoryVolume) * 100
                        : 0;
                    return (
                      <li
                        key={c.category}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-white/85 truncate">
                            {c.category}
                          </span>
                          <span className="text-xs text-white/50">
                            {fmtMoney(c.total)} • {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden shrink-0">
                          <div
                            className="h-full rounded-full bg-[#00E0FF]"
                            style={{
                              width: `${Math.max(10, Math.min(100, pct))}%`,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-2 font-semibold">
              Monthly trend
            </div>
            <p className="text-xs text-white/60">
              Net inflows vs outflows across each recent month.
            </p>
            <div className="mt-4">
              <MiniTrendChart points={monthlyTrend} height={140} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-2 font-semibold">
              Rail split
            </div>
            <p className="text-xs text-white/60 mb-3">
              How your volume is distributed across ACH, wires, P2P and crypto rails.
            </p>
            {railSummary.slice(0, 5).length === 0 ? (
              <div className="text-sm text-white/55">No rail activity yet.</div>
            ) : (
              <div className="space-y-3 text-sm text-white/80">
                {railSummary.slice(0, 5).map((r) => {
                  const pct =
                    totalRailVolume > 0 ? (r.total / totalRailVolume) * 100 : 0;
                  return (
                    <div key={r.rail} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{r.rail}</span>
                        <span className="text-white/55">
                          {fmtMoney(r.total)} • {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full bg-[#00E0FF]"
                          style={{
                            width: `${Math.max(10, Math.min(100, pct))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-white/45">
                        <span>Sent: {fmtMoney(r.sent)}</span>
                        <span>Received: {fmtMoney(r.received)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Sheet>

      <Sheet open={showSecurity} onClose={() => setShowSecurity(false)} title="Security">
        <div className="space-y-4">
          <Row label="App PIN" action="Change" icon={<Lock size={18} />} />
          <Row label="Quick sign-in" action="Manage" icon={<Shield size={18} />} />
          <Row label="Devices" action="View" icon={<Shield size={18} />} />
        </div>
      </Sheet>

      <Sheet open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div className="grid lg:grid-cols-[360px,1fr] gap-6">
          {/* Profile card */}
          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-4 font-semibold">Profile</div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-2xl overflow-hidden bg-white/15 border border-white/20 grid place-items-center shadow-md">
                  {profileAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileAvatar}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={28} className="text-white/70" />
                  )}
                </div>

                <button
                  onClick={avatarUploading ? undefined : handlePickAvatar}
                  className="absolute -bottom-3 -right-3 h-10 w-10 rounded-2xl bg-white/15 border border-white/20 grid place-items-center shadow-md transition-all hover:bg-white/20"
                  title={avatarUploading ? "Uploading…" : "Change photo"}
                >
                  {avatarUploading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>
              </div>

              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {profileFirst || "—"} {profileLast}
                </div>
                <div className="text-white/70 truncate">
                  {profileEmail || "you@example.com"}
                </div>
                {profileHandle && (
                  <div className="text-xs text-white/50 truncate mt-1">
                    @{profileHandle.replace(/^@/, "")}
                  </div>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {profileAvatar && (
              <button
                onClick={handleAvatarRemove}
                className="mt-4 inline-flex items-center gap-3 text-sm text-rose-300 hover:underline transition-all disabled:opacity-60"
                disabled={avatarUploading}
              >
                <Trash2 size={16} /> Remove photo
              </button>
            )}
            {avatarError && <div className="mt-3 text-sm text-rose-300">{avatarError}</div>}

            <div className="h-px bg-white/20 my-5" />

            <form className="grid gap-4" onSubmit={handleSaveSettings}>
              <LabeledInput
                icon={<User size={16} />}
                label="First name"
                value={profileFirst}
                setValue={setProfileFirst}
              />
              <LabeledInput
                icon={<User size={16} />}
                label="Last name"
                value={profileLast}
                setValue={setProfileLast}
              />
              <LabeledInput
                icon={<Mail size={16} />}
                label="Email"
                value={profileEmail}
                setValue={setProfileEmail}
                type="email"
              />
              <LabeledInput
                icon={<Phone size={16} />}
                label="Phone"
                value={profilePhone}
                setValue={setProfilePhone}
              />
              <LabeledInput
                icon={<User size={16} />}
                label="Username / handle"
                value={profileHandle}
                setValue={setProfileHandle}
                placeholder="@handle"
              />
              <LabeledInput
                icon={<MapPin size={16} />}
                label="Address"
                value={profileAddress}
                setValue={setProfileAddress}
              />

              <div className="flex items-center gap-4 pt-1">
                <button
                  type="submit"
                  className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 inline-flex items-center gap-3 shadow-md transition-all"
                >
                  <Save size={16} /> Save changes
                </button>
                <button
                  type="button"
                  className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 shadow-md transition-all hover:bg-white/[0.12]"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Preferences + notifications */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-base text-white/80 mb-4 font-semibold">
                Preferences
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm grid gap-2">
                  <span className="text-white/70">Currency</span>
                  <select
                    className="w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-base shadow-inner"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="NGN">NGN</option>
                  </select>
                </label>

                <label className="text-sm grid gap-2">
                  <span className="text-white/70">Timezone</span>
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-base shadow-inner"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                  />
                  Email notifications
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifyPush}
                    onChange={(e) => setNotifyPush(e.target.checked)}
                  />
                  Push notifications
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-base text-white/80 mb-3 font-semibold">
                Shortcuts
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <PrimaryButton onClick={() => setShowAccounts(true)}>
                  <Wallet size={16} /> Accounts
                </PrimaryButton>
                <PrimaryButton onClick={() => setShowSecurity(true)}>
                  <Shield size={16} /> Security
                </PrimaryButton>
                <PrimaryButton onClick={openTransactions}>
                  <CreditCard size={16} /> Transactions
                </PrimaryButton>
                <PrimaryButton onClick={() => setShowNotifications(true)}>
                  <Bell size={16} /> Notifications
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet open={showNotifications} onClose={() => setShowNotifications(false)} title="Notifications">
        <NotificationsPanel activities={activities} />
      </Sheet>
    </main>
  );
}

/* -------------------------------- subcomponents ------------------------------- */

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const toneClass =
    tone === "pos"
      ? "text-emerald-300 border-emerald-500/25 bg-emerald-500/10"
      : tone === "neg"
      ? "text-rose-300 border-rose-500/25 bg-rose-500/10"
      : "text-white/70 border-white/15 bg-white/10";

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${toneClass}`}
    >
      <span className="text-white/55">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  kind,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary";
}) {
  const cls =
    kind === "primary"
      ? "bg-[#00E0FF]/12 hover:bg-[#00E0FF]/16 border-[#00E0FF]/30"
      : "bg-white/10 hover:bg-white/15 border-white/20";
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl border flex items-center justify-center gap-2 shadow-lg transition-all text-sm ${cls}`}
    >
      {children}
    </button>
  );
}

function AccountCard({
  label,
  balance,
  color,
  icon,
  subtitle,
  onClick,
}: {
  label: string;
  balance: number;
  color: string;
  icon: ReactNode;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg shadow-2xl hover:shadow-xl hover:bg-white/[0.05] transition-all duration-300 ring-1 ring-white/5"
    >
      <div className="flex items-center gap-3 text-sm text-white/70">
        <div
          className="h-10 w-10 rounded-full border border-white/10 grid place-items-center"
          style={{ color }}
        >
          {icon}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate">{label}</span>
          {subtitle && (
            <span className="text-[11px] text-white/50 mt-0.5 truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="text-3xl font-bold mt-4 tabular-nums">
        ${balance.toLocaleString()}
      </div>
    </button>
  );
}

function CryptoCard({
  label,
  color,
  icon,
  totalUsd,
  change24h,
  loading,
  assetsCount,
  onClick,
}: {
  label: string;
  color: string;
  icon: ReactNode;
  totalUsd: number;
  change24h?: number | null;
  loading?: boolean;
  assetsCount?: number;
  onClick?: () => void;
}) {
  const change24hValue =
    typeof change24h === "number" && isFinite(change24h) ? change24h : null;

  const changeTone =
    change24hValue !== null
      ? change24hValue >= 0
        ? "text-emerald-400"
        : "text-rose-400"
      : "text-white/60";

  const sparkStroke =
    change24hValue !== null
      ? change24hValue >= 0
        ? "#33D69F"
        : "#FF4D4F"
      : "#FFFFFF40";

  const assetsLabel =
    typeof assetsCount === "number" && assetsCount > 0
      ? `${assetsCount} asset${assetsCount > 1 ? "s" : ""} tracked`
      : "No holdings yet";

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg shadow-2xl hover:shadow-xl hover:bg-white/[0.05] transition-all duration-300 ring-1 ring-white/5"
    >
      <div className="flex items-center gap-3 text-sm text-white/70">
        <div
          className="h-10 w-10 rounded-full border border-white/10 grid place-items-center"
          style={{ color }}
        >
          {icon}
        </div>
        {label}
      </div>

      <div className="text-3xl font-bold mt-4 tabular-nums">
        {loading ? "…" : `$${totalUsd.toLocaleString()}`}
      </div>

      <div className="text-xs text-white/60 mt-2 flex flex-col">
        <span className="font-medium">{assetsLabel}</span>

        {change24hValue !== null && (
          <span className={`${changeTone} mt-0.5`}>
            {change24hValue >= 0 ? "▲" : "▼"}{" "}
            {Math.abs(change24hValue).toFixed(2)}% 24h
          </span>
        )}
      </div>

      <div className="mt-4 h-8 w-full">
        <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path
            d="M0 18 Q25 10, 50 15 T100 5"
            fill="none"
            stroke={sparkStroke}
            strokeWidth="1.5"
            opacity="0.55"
          />
        </svg>
      </div>
    </button>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex flex-col items-center justify-center py-5 px-4 backdrop-blur-lg shadow-2xl ring-1 ring-white/5"
    >
      <div className="h-12 w-12 rounded-full bg-white/10 border border-white/20 grid place-items-center mb-2">
        {icon}
      </div>
      <div className="text-sm text-white/80">{label}</div>
    </button>
  );
}

function StatCard({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md shadow-2xl ring-1 ring-white/5">
      <div className="text-xs text-white/60">{k}</div>
      <div className="text-lg font-bold mt-2 tabular-nums">{v}</div>
      {sub && <div className="text-xs text-white/50 mt-1">{sub}</div>}
    </div>
  );
}

function InsightStat({
  label,
  value,
  trend,
  positive,
}: {
  label: string;
  value: string;
  trend: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md shadow-2xl ring-1 ring-white/5">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-semibold mt-2 tabular-nums">{value}</div>
      <div
        className={`text-xs mt-2 ${
          positive === undefined
            ? "text-white/50"
            : positive
            ? "text-emerald-400"
            : "text-rose-400"
        }`}
      >
        {trend}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5 flex items-center justify-between backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3 text-base text-white/90">
        {icon} {label}
      </div>
      {value && <div className="text-xl font-bold tabular-nums">{value}</div>}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="text-white/70">{k}</div>
      <div className="font-mono tracking-wide">{v}</div>
    </div>
  );
}

function Row({
  label,
  action,
  icon,
}: {
  label: string;
  action?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3 text-base text-white/90">
        {icon} {label}
      </div>
      {action && (
        <button className="text-base text-[#00E0FF] hover:underline transition-all">
          {action}
        </button>
      )}
    </div>
  );
}

function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[680px] bg-[#0F1622] border-l border-white/20 shadow-[0_12px_48px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/20">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            aria-label="Close"
            className="h-10 w-10 rounded-2xl hover:bg-white/15 grid place-items-center transition-all"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100%-64px)]">{children}</div>
      </div>
    </div>
  );
}

function LabeledInput({
  icon,
  label,
  value,
  setValue,
  placeholder,
  type,
}: {
  icon?: ReactNode;
  label: string;
  value?: string;
  setValue?: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">
            {icon}
          </div>
        )}
        <input
          type={type || "text"}
          value={value}
          onChange={(e) => setValue?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-2xl bg-white/10 border border-white/20 ${
            icon ? "pl-11" : "pl-4"
          } pr-4 py-3 text-base shadow-inner`}
        />
      </div>
    </label>
  );
}

/* -------------------------- Transactions Panel -------------------------- */

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function TxnRow({
  t,
  onClick,
}: {
  t: TxnRowUnified;
  onClick?: () => void;
}) {
  const isIncome = t.amount > 0;
  const date = new Date(t.date);
  const railLabel = prettyRail(t.rail) ?? "Transfer";

  const rawTitle = (t.title || "").trim();
  const titleText =
    !rawTitle || isProviderLabel(rawTitle) ? t.subtitle || "Unknown" : rawTitle;

  const showSubtitle =
    t.subtitle &&
    t.subtitle.trim().toLowerCase() !== titleText.trim().toLowerCase();

  const hasCrypto =
    !!t.crypto &&
    Number.isFinite(Number(t.crypto.amount)) &&
    t.crypto.amount !== 0;
  const cryptoSymbol = t.crypto?.symbol
    ? String(t.crypto.symbol).toUpperCase()
    : undefined;

  const primaryCryptoAmount = hasCrypto ? Math.abs(Number(t.crypto!.amount)) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`h-10 w-10 rounded-2xl grid place-items-center border shrink-0 ${
            isIncome
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </div>

        <div className="min-w-0">
          <div className="text-base font-semibold truncate max-w-[220px] sm:max-w-[360px]">
            {titleText}
          </div>

          <div className="text-sm text-white/60 truncate">
            {railLabel} • {t.account} • {date.toLocaleDateString()}
          </div>

          {showSubtitle && (
            <div className="text-xs text-white/60 mt-0.5 truncate">
              {t.subtitle}
            </div>
          )}
          {t.note && (
            <div className="text-xs text-white/50 mt-0.5 truncate">
              Note: {t.note}
            </div>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div
          className={`text-base font-bold tabular-nums ${
            isIncome ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isIncome ? "+" : "−"}
          {hasCrypto && cryptoSymbol && primaryCryptoAmount !== null
            ? `${primaryCryptoAmount.toFixed(6)} ${cryptoSymbol}`
            : fmtMoney(Math.abs(t.amount))}
        </div>
        {hasCrypto && (
          <div className="text-xs text-white/60 mt-0.5 tabular-nums">
            ≈ {fmtMoney(Math.abs(t.amount))}
          </div>
        )}
      </div>
    </button>
  );
}

function groupByDate(rows: TxnRowUnified[]) {
  const map = new Map<string, TxnRowUnified[]>();
  rows.forEach((r) => {
    const k = new Date(r.date).toDateString();
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  });
  return Array.from(map.entries()).sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );
}

function TransactionsPanel({
  txns,
  onOpenTxn,
}: {
  txns: TxnRowUnified[];
  onOpenTxn: (t: TxnRowUnified) => void;
}) {
  const [tab, setTab] = useState<"sent" | "received" | "all">("all");

  let rows = txns.filter((t) =>
    tab === "all" ? true : tab === "received" ? t.amount > 0 : t.amount < 0
  );
  rows = rows.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const last30 = useMemo(() => totalsLastNDays(txns, 30), [txns]);
  const grouped = groupByDate(rows);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <SummaryCard label="Sent (last 30d)" value={fmtMoney(last30.sent)} tone="sent" />
        <SummaryCard
          label="Received (last 30d)"
          value={fmtMoney(last30.received)}
          tone="received"
        />
        <SummaryCard label="Net (last 30d)" value={fmtMoney(last30.net)} />
      </div>

      <div className="md:sticky md:top-[64px] z-[5] -mx-6 px-6 py-4 bg-[#0F1622]/95 backdrop-blur-md border-y border-white/20 shadow-md">
        <div className="flex items-center justify-center">
          <TabPills current={tab} onChange={setTab} />
        </div>
      </div>

      <div className="rounded-3xl border border-white/20 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {grouped.length === 0 ? (
          <div className="p-12 text-center text-white/70 text-base">
            No transactions.
          </div>
        ) : (
          grouped.map(([dateLabel, items]) => (
            <div key={dateLabel} className="bg-white/[0.03]">
              <div className="px-6 pt-5 pb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-white/10 border border-white/20 text-white/70">
                  {dateLabel}
                </span>
              </div>
              {items.map((t) => (
                <TxnRow key={t.id} t={t} onClick={() => onOpenTxn(t)} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "sent" | "received";
}) {
  const toneClass =
    tone === "sent"
      ? "text-rose-400"
      : tone === "received"
      ? "text-emerald-400"
      : "text-white";
  return (
    <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="text-sm text-white/70">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${toneClass} tabular-nums`}>
        {value}
      </div>
    </div>
  );
}

function TabPills({
  current,
  onChange,
}: {
  current: "sent" | "received" | "all";
  onChange: (v: "sent" | "received" | "all") => void;
}) {
  const tabs = [
    { key: "all" as const, label: "All", icon: <CreditCard className="h-5 w-5" /> },
    { key: "sent" as const, label: "Sent", icon: <ArrowUpRight className="h-5 w-5" /> },
    {
      key: "received" as const,
      label: "Received",
      icon: <ArrowDownLeft className="h-5 w-5" />,
    },
  ];
  return (
    <div className="flex items-center gap-3">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-4 py-2 rounded-2xl text-sm border flex items-center gap-2 shadow-md transition-all ${
              active
                ? "bg-[#00E0FF]/15 border-[#00E0FF]/40"
                : "bg-white/10 border-white/20 hover:bg-white/[0.12]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- Notifications ------------------------------ */
function NotificationsPanel({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-6 text-center text-white/70">
        <AlertCircle className="mx-auto mb-2 opacity-70" />
        No notifications yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {activities.map((a, i) => (
        <div
          key={a.id || `act-${i}`}
          className="rounded-2xl border border-white/20 bg-white/[0.04] p-4 flex items-start gap-3"
        >
          <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 grid place-items-center text-emerald-300">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{a.title}</div>
            <div className="text-xs text-white/60 mt-0.5 truncate">
              {new Date(a.createdAt || Date.now()).toLocaleString()} • {a.kind}
              {a.type ? ` • ${a.type}` : ""} {a.to ? ` • ${a.to}` : ""}{" "}
              {a.amount ? ` • ${a.amount}` : ""} {a.ref ? ` • Ref ${a.ref}` : ""}
            </div>
            {a.meta && Object.keys(a.meta).length > 0 && (
              <div className="text-xs text-white/60 mt-1">
                {Object.entries(a.meta)
                  .slice(0, 3)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(" • ")}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Virtual Card ------------------------------- */

function VirtualCard({
  label,
  holder,
  last4,
  network,
}: {
  label: string;
  holder?: string;
  last4?: string;
  network?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] via-[#0B1924] to-[#05070B] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#00E0FF]/15 blur-3xl" />
      <div className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-[#33D69F]/10 blur-3xl" />
      <div className="flex items-center justify-between text-xs text-white/70 relative">
        <span className="inline-flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-white/15 grid place-items-center border border-white/30">
            <CreditCard size={12} />
          </span>
          {label}
        </span>
        <span className="uppercase tracking-[0.2em] text-[10px] text-white/60">
          Virtual
        </span>
      </div>

      <div className="mt-6 flex items-center gap-3 relative">
        <div className="h-8 w-12 rounded-md bg-white/80 opacity-80" />
        <div className="flex-1 space-y-1">
          <div className="text-[11px] text-white/50">Card number</div>
          <div className="font-mono tracking-[0.25em] text-sm">
            {last4 ? `•••• •••• •••• ${last4}` : "•••• •••• •••• ••••"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between text-xs relative">
        <div className="space-y-1">
          <div className="text-white/50 text-[11px]">Card holder</div>
          <div className="text-sm font-semibold">{holder || "Horizon User"}</div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-white/50 text-[11px]">Expires</div>
          <div className="font-mono text-sm tracking-[0.2em]">12/28</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/60 uppercase">
            {network || "Visa"}
          </div>
          <div className="text-lg font-semibold tracking-[0.15em]">VISA</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Mini Trend Chart ----------------------------- */

function MiniTrendChart({
  points,
  height = 80,
}: {
  points: { label: string; net: number }[];
  height?: number;
}) {
  if (!points || points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[11px] text-white/45 rounded-2xl bg-white/[0.02] border border-white/10"
        style={{ height }}
      >
        Not enough history yet
      </div>
    );
  }

  const width = 100;
  const h = 40;
  const padX = 4;
  const padY = 4;

  const values = points.map((p) => p.net);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const xs = values.map((_, i) =>
    values.length === 1
      ? width / 2
      : padX + ((width - padX * 2) * i) / (values.length - 1)
  );

  const ys = values.map((v) => {
    const normalized = (v - min) / span;
    return padY + (h - padY * 2) * (1 - normalized);
  });

  const lineD = values
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys[i]}`)
    .join(" ");

  const areaD =
    `M ${xs[0]} ${h - padY} ` +
    values.map((_, i) => `L ${xs[i]} ${ys[i]}`).join(" ") +
    ` L ${xs[xs.length - 1]} ${h - padY} Z`;

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${h}`} className="w-full h-[70%]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00E0FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00E0FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#trendFill)" opacity="0.7" />
        <path
          d={lineD}
          fill="none"
          stroke="#00E0FF"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={1.5} fill="#00E0FF" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-white/50">
        {points.map((p, i) => (
          <span key={`${p.label}-${i}`} className="truncate">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Utilities -------------------------------- */
function maskAccount(acct?: string) {
  if (!acct) return "";
  const d = acct.replace(/\s/g, "");
  if (d.length <= 4) return "••••";
  return `••••${d.slice(-4)}`;
}

function last4FromCard(card?: string, fallback?: string) {
  if (fallback) return fallback;
  if (!card) return "";
  const digits = card.replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-4);
}
