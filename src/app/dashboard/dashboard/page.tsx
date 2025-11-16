// app/dashboard/page.tsx — Horizon (INTELLIGENT TXNS + INSIGHTS)
// - Direction-aware counterparty resolution (origin vs beneficiary)
// - Deep fallbacks for name/handle/bank last4, incl. provider meta blocks
// - Provider names never appear as bold title; they live in subtitle only
// - Real 30d stats, YTD, cleaner UI
// - Avatar upload: Cloudinary unsigned → save to /users/me/profile → live preview (+ optional nav refresh event)
// - Modernized layout: Vertical stack for better mobile experience, enhanced cards with subtle gradients, improved typography, added total assets, sparkline placeholder for crypto, refined quick actions and insights

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
  Loader2, // ⬅ spinner for avatar upload
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
  title: string; // human name/handle — never provider
  subtitle?: string; // handle/email/phone or Acct••••
  direction: "sent" | "received";
  note?: string;
  ref?: string;
  crypto?: {
    symbol: string;
    amount: number;
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
  // Prefer direction-correct explicit party
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
    input?.merchant // legacy, but only if not provider-ish (we’ll filter later)
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

  const bankLast4 = firstNonEmpty(
    party?.bank?.last4,
    input?.bank?.last4,
    input?.meta?.bank?.last4,
    input?.meta?.bank?.iban,
    input?.meta?.bank?.pan,
    input?.meta?.bank?.account
  );

  return { partyName, partyHandle, bankLast4 };
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
  const signed =
    direction === "sent" ? -Math.abs(Math.abs(amt)) : Math.abs(Math.abs(amt));

  // 2) Rail
  const rail =
    (input?.rail as string | undefined) ||
    (input?.meta?.rail as string | undefined);

  // 3) Counterparty (direction-aware)
  const { partyName, partyHandle, bankLast4 } = pickParty(input, direction);

  // Name: drop provider-like strings
  const nameHuman =
    partyName && !isProviderLabel(partyName) ? partyName : undefined;

  // Handle/email/phone prettification
  let handle = partyHandle;
  // if it's an email and name is missing, turn local-part into a friendly display
  if (!nameHuman && handle && /@/.test(handle)) {
    handle = prettifyEmailLocal(handle) || handle;
  }
  // if it's a raw phone, mask it
  if (!nameHuman && handle && /^\+?[\d\s().-]+$/.test(handle)) {
    handle = maskPhone(handle) || handle;
  }

  // Bank last4 normalize
  const last4 = bankLast4 ? String(bankLast4).slice(-4) : undefined;

  // 4) Title (never provider/rail)
  const merchantRaw =
    (input?.merchant && String(input.merchant).trim()) || undefined;
  const merchantHuman =
    merchantRaw && !isProviderLabel(merchantRaw) ? merchantRaw : undefined;

  const title =
    nameHuman ||
    merchantHuman ||
    (handle && !isProviderLabel(handle) ? handle : undefined) ||
    (last4 ? `Acct ••••${last4}` : "Unknown");

  // 5) Subtitle — prefer a different signal from title
  const railPretty = prettyRail(rail);
  let subtitle: string | undefined =
    nameHuman && handle
      ? handle
      : !nameHuman && last4 && title !== `Acct ••••${last4}`
      ? `Acct ••••${last4}`
      : railPretty;

  if (subtitle && subtitle.trim().toLowerCase() === title.trim().toLowerCase()) {
    // avoid duplicates like when title is the handle
    subtitle =
      railPretty && railPretty.toLowerCase() !== title.toLowerCase()
        ? railPretty
        : undefined;
  }

  // 6) Account kind
  const account: TxnRowUnified["account"] =
    (input?.accountType as any) ||
    (rail &&
    [
      "crypto",
      "crypto_buy",
      "crypto_swap",
      "crypto_send",
      "crypto_receive",
    ].includes(String(rail).toLowerCase())
      ? "Crypto"
      : "Checking");

  // 7) Crypto mirror
  const cryptoRow = input?.crypto || input?.meta?.crypto;
  const crypto =
    cryptoRow && {
      symbol: cryptoRow.symbol || "BTC",
      amount: num(cryptoRow.amount ?? cryptoRow.qty),
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

        // 🔥 Build holdings from per-coin user.balances fields
        const balances = user.balances || {};
        const holdings: Record<string, number> = {};

        const addHolding = (id: string, raw: any) => {
          const n = Number(raw ?? 0);
          if (Number.isFinite(n) && n > 0) holdings[id] = n;
        };

        // Per-coin fields (units)
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

        // Optional legacy map: balances.cryptoHoldings = { bitcoin: { amount }, eth: { amount } }
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
          normalized.sort(
            (a, b) => +new Date(b.date) - +new Date(a.date)
          );
          setTxns(normalized);
        } catch (e) {
          console.warn("txns fetch error", e);
        }

        // Notifications
        try {
          const acts = await request<{ items: any[] }>(
            "/users/me/activities"
          );
          const list = Array.isArray(acts?.items) ? acts.items : [];
          if (list.length) {
            setActivities(
              list.sort(
                (a, b) =>
                  new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
              )
            );
          }
        } catch {}
      } catch {
        router.replace("/dashboard/loginpage");
      }
    })();
  }, [router]);

  const totalFiat = useMemo(
    () => checkingBalance + savingsBalance,
    [checkingBalance, savingsBalance]
  );

  // 🔢 Live crypto pricing for ALL holdings
  const assetIds = useMemo(
    () => Object.keys(cryptoHoldings),
    [cryptoHoldings]
  );

  const { perAsset, loading: priceLoading } = useLiveCrypto({
    ids: assetIds.length ? assetIds : ["bitcoin"],
    amounts: assetIds.length ? cryptoHoldings : { bitcoin: btcAmountBase },
    pollMs: 15000,
  });

  // Total crypto USD across all held assets
  const totalCryptoUsd = useMemo(() => {
    if (!perAsset) return 0;
    return Object.values(perAsset).reduce((sum, asset: any) => {
      const v = Number(asset?.usdValue ?? 0);
      return Number.isFinite(v) ? sum + v : sum;
    }, 0);
  }, [perAsset]);

  // Portfolio-wide 24h % change (value-weighted across assets)
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

  // 🔹 Monthly net trend for mini charts (last 6 months)
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

  // 🔹 Category breakdown (absolute volumes)
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

  // 🔹 Rail split (PayPal / Zelle / ACH etc)
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

  // ⬇ REPLACED: local FileReader preview → Cloudinary unsigned upload + save
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      // Upload to Cloudinary (unsigned preset from env)
      const url = await uploadAvatarUnsigned(file, {
        folder: "horizon/avatars",
      });
      // Persist on backend
      await saveAvatar(url); // PATCH /users/me/profile { avatarUrl: url }
      // Update UI
      setProfileAvatar(url);
      // Optional: let the Nav (or any listener) know immediately
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
      // clear input so selecting the same file again re-triggers change
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      // Clear on backend (empty string is fine; backend can interpret as unset)
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
        // avatarUrl already saved during upload, but keep it in sync if present:
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

  // 🔗 When a user taps a transaction, deep-link into /Transfer/success
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
        // swallow; Success page has its own fallbacks
      }
    }

    const params = new URLSearchParams();
    if (ref) params.set("ref", ref);
    router.push(`/Transfer/success?${params.toString()}`);
  }

  const visualCardLast4 = last4FromCard(cardNumber, cardLast4);

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
        {...({ avatarUrl: profileAvatar || undefined } as any)} // if Nav supports it, it updates immediately
      />

      {/* Modernized Hero / balances - Centered, vertical layout, enhanced gradients and shadows */}
      <section className="pt-[100px] container-x">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#101826]/80 to-[#0B0F14]/80 p-8 shadow-2xl backdrop-blur-lg ring-1 ring-white/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60">Welcome back,</div>
                <div className="text-2xl font-semibold mt-1">
                  {userName || "User"}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 border border-white/20">
                {profileAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileAvatar}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white/50 m-auto mt-2.5" />
                )}
              </div>
            </div>
            <div className="mt-6 text-sm text-white/70">Total Assets</div>
            <div className="text-5xl font-bold mt-1 tracking-tight">
              ${totalAssets.toLocaleString()}
            </div>
            <div className="text-xs text-white/50 mt-2">
              All accounts including crypto
            </div>
            <div className="flex gap-4 text-xs text-white/60 mt-3">
              <span>Fiat: ${totalFiat.toLocaleString()}</span>
              <span>•</span>
              <span>Crypto: ${totalCryptoUsd.toLocaleString()}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 flex items-center gap-2 shadow-lg transition-all text-sm"
                onClick={openQuickAddMoney}
              >
                <Plus size={14} /> Add money
              </button>
              <button
                className="px-4 py-2.5 rounded-full bg-[#00E0FF]/10 hover:bg-[#00E0FF]/15 border border-[#00E0FF]/30 flex items-center gap-2 shadow-lg transition-all text-sm"
                onClick={openQuickTransfer}
              >
                <ArrowUpRight size={14} /> Transfer
              </button>
              <button
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 flex items-center gap-2 shadow-lg transition-all text-sm"
                onClick={openInsights}
              >
                <BarChart3 size={14} /> Insights
              </button>
            </div>
          </div>

          {/* Enhanced Accounts - Larger icons, subtitles with details, subtle hover animations, crypto with portfolio view */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Modernized Quick Actions - Rounded full, larger icons, horizontal scroll on mobile */}
      <section className="container-x mt-10">
        <div className="text-sm text-white/70 mb-4">Quick actions</div>
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
          <ActionTile
            icon={<ArrowUpRight size={28} />}
            label="Transfer"
            onClick={openQuickTransfer}
          />
          <ActionTile
            icon={<Plus size={28} />}
            label="Add money"
            onClick={openQuickAddMoney}
          />
          <ActionTile
            icon={<CreditCard size={28} />}
            label="Pay bills"
            onClick={openPayBills}
          />
          <ActionTile
            icon={<BarChart3 size={28} />}
            label="Insights"
            onClick={openInsights}
          />
        </div>
      </section>

      {/* Enhanced Insights - Cleaner stats, added trend icons, mini chart powered by txns */}
      <section className="container-x mt-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg shadow-2xl ring-1 ring-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Spending & Income</h2>
            <div className="flex items-center gap-2 text-xs">
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

          <div className="grid sm:grid-cols-3 gap-4">
            <InsightStat
              label="Sent (this month)"
              value={fmtMoney(monthSentRecv.sent)}
              trend="—"
            />
            <InsightStat
              label="Received (this month)"
              value={fmtMoney(monthSentRecv.received)}
              trend="—"
            />
            <InsightStat
              label="Net (this month)"
              value={fmtMoney(monthSentRecv.net)}
              trend={monthSentRecv.net >= 0 ? "▲ positive" : "▼ negative"}
              positive={monthSentRecv.net >= 0}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <StatCard
              k="YTD Sent"
              v={fmtMoney(ytd.sent)}
              sub="Year-to-date total outflows"
            />
            <StatCard
              k="YTD Received"
              v={fmtMoney(ytd.received)}
              sub="Year-to-date total inflows"
            />
          </div>

          {/* Mini chart using monthly net trend */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-white/70">Monthly trend</div>
              {monthlyTrend.length > 0 && (
                <div className="text-[11px] text-white/50">
                  Last {monthlyTrend.length} months • Net flow
                </div>
              )}
            </div>
            <MiniTrendChart points={monthlyTrend} />
          </div>
        </div>
      </section>

      {/* Recent Activity - Kept similar but with enhanced row styling */}
      <section className="container-x mt-10 pb-32">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <button
            onClick={openTransactions}
            className="text-sm text-[#00E0FF] hover:underline flex items-center gap-2 transition-all"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] divide-y divide-white/10 shadow-2xl ring-1 ring-white/5">
          {txns.slice(0, 5).length === 0 ? (
            <div className="p-8 text-center text-white/70">
              No transactions yet.
            </div>
          ) : (
            txns.slice(0, 5).map((t) => (
              <TxnRow
                key={t.id}
                t={t}
                onClick={() => handleOpenTxn(t)}
              />
            ))
          )}
        </div>
      </section>

      {/* Floating Notifications button */}
      <button
        onClick={() => setShowNotifications(true)}
        title="Notifications"
        className="fixed right-5 bottom-5 h-12 w-12 rounded-full bg-white/10 border border-white/20 grid place-items-center shadow-2xl hover:bg-white/15 transition-all"
      >
        <Bell size={18} />
      </button>

      {/* ----------------------------- MODALS ----------------------------- */}

      <Sheet
        open={showAccounts}
        onClose={() => setShowAccounts(false)}
        title="Accounts"
      >
        <div className="space-y-4">
          <InfoRow
            icon={<Wallet size={18} />}
            label="Checking"
            value={`$${checkingBalance.toLocaleString()}`}
          />
          <InfoRow
            icon={<PiggyBank size={18} />}
            label="Savings"
            value={`$${savingsBalance.toLocaleString()}`}
          />
          <InfoRow
            icon={<Bitcoin size={18} />}
            label="Crypto"
            value={`$${totalCryptoUsd.toLocaleString()}`}
          />

          <div className="h-px bg-white/20 my-3" />

          {/* Virtual card + account numbers */}
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
              <KeyVal
                k="Routing number"
                v={routingNumber || "—"}
              />
              <KeyVal
                k="Account number"
                v={maskAccount(accountNumber) || "—"}
              />
              <KeyVal
                k="Virtual card"
                v={
                  visualCardLast4
                    ? `•••• •••• •••• ${visualCardLast4}`
                    : "—"
                }
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              className="mt-3 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 shadow-md transition-all"
              onClick={openCrypto}
            >
              <CreditCard size={18} /> Manage Crypto
            </button>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={showTransactions}
        onClose={() => setShowTransactions(false)}
        title="Transactions"
      >
        <TransactionsPanel
          txns={txns}
          onOpenTxn={handleOpenTxn}
        />
      </Sheet>

      <Sheet
        open={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Spending Insights"
      >
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-5">
            <StatCard
              k="This month Sent"
              v={fmtMoney(monthSentRecv.sent)}
              sub="Outflows this month"
            />
            <StatCard
              k="This month Received"
              v={fmtMoney(monthSentRecv.received)}
              sub="Inflows this month"
            />
            <StatCard
              k="YTD Net"
              v={fmtMoney(ytd.received - ytd.sent)}
              sub="Income − Spend"
            />
            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-base text-white/80 mb-3 font-semibold">
                Top categories
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                {categorySummary.slice(0, 4).length === 0 ? (
                  <li className="text-xs text-white/50">
                    No categorized spend yet.
                  </li>
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
                        <div className="flex flex-col">
                          <span className="text-sm text-white/85">
                            {c.category}
                          </span>
                          <span className="text-xs text-white/50">
                            {fmtMoney(c.total)} • {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-20 rounded-full bg-white/10 overflow-hidden">
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
              Net inflows vs outflows across your recent months.
            </p>
            <div className="mt-4">
              <MiniTrendChart points={monthlyTrend} height={120} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-2 font-semibold">
              Rail split
            </div>
            <p className="text-xs text-white/60 mb-3">
              How your volume is distributed across rails like ACH, Zelle,
              PayPal and more.
            </p>
            {railSummary.slice(0, 5).length === 0 ? (
              <div className="text-sm text-white/55">
                No rail activity yet.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-white/80">
                {railSummary.slice(0, 5).map((r) => {
                  const pct =
                    totalRailVolume > 0
                      ? (r.total / totalRailVolume) * 100
                      : 0;
                  return (
                    <div
                      key={r.rail}
                      className="space-y-1"
                    >
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

      <Sheet
        open={showSecurity}
        onClose={() => setShowSecurity(false)}
        title="Security"
      >
        <div className="space-y-4">
          <Row label="App PIN" action="Change" icon={<Lock size={18} />} />
          <Row
            label="Quick sign-in"
            action="Manage"
            icon={<Shield size={18} />}
          />
          <Row
            label="Devices"
            action="View"
            icon={<Shield size={18} />}
          />
        </div>
      </Sheet>

      <Sheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
      >
        <div className="grid lg:grid-cols-[320px,1fr] gap-8">
          {/* Profile quick card */}
          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-4 font-semibold">
              Profile
            </div>

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

                {/* Upload button / spinner */}
                <button
                  onClick={avatarUploading ? undefined : handlePickAvatar}
                  className="absolute -bottom-3 -right-3 h-10 w-10 rounded-2xl bg.white/15 bg-white/15 border border-white/20 grid place-items-center shadow-md transition-all"
                  title={avatarUploading ? "Uploading…" : "Change photo"}
                >
                  {avatarUploading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Camera size={18} />
                  )}
                </button>
              </div>

              <div className="text-base">
                <div className="font-semibold">
                  {profileFirst || "—"} {profileLast}
                </div>
                <div className="text-white/70">
                  {profileEmail || "you@example.com"}
                </div>
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
            {avatarError && (
              <div className="mt-3 text-sm text-rose-300">
                {avatarError}
              </div>
            )}

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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="flex items-center gap-6 text-sm text-white/80">
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

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 inline-flex items-center gap-3 shadow-md transition-all"
                >
                  <Save size={16} /> Save changes
                </button>
                <button
                  type="button"
                  className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 shadow-md transition-all"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </Sheet>

      {/* Notifications */}
      <Sheet
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
      >
        <NotificationsPanel activities={activities} />
      </Sheet>
    </main>
  );
}

/* -------------------------------- subcomponents ------------------------------- */

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
      className="text-left rounded-3xl border border.white/10 border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg shadow-2xl hover:shadow-xl hover:bg-white/[0.05] transition-all duration-300 ring-1 ring-white/5"
    >
      <div className="flex items-center gap-3 text-sm text-white/70">
        <div
          className="h-10 w-10 rounded-full border border-white/10 grid place-items-center"
          style={{ color }}
        >
          {icon}
        </div>
        <div className="flex flex-col">
          <span>{label}</span>
          {subtitle && (
            <span className="text-[11px] text-white/50 mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="text-3xl font-bold mt-4">
        ${balance.toLocaleString()}
      </div>
    </button>
  );
}

/** CryptoCard — Portfolio view: total USD + 24h change */
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
      : "#FFFFFF40"; // fallback when change24h is undefined

  const assetsLabel =
    typeof assetsCount === "number" && assetsCount > 0
      ? `${assetsCount} asset${assetsCount > 1 ? "s" : ""} tracked`
      : "No holdings yet";

  return (
    <button
      onClick={onClick}
      className="text-left rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-lg shadow-2xl hover:shadow-xl hover:bg-white/[0.05] transition-all duration-300 ring-1 ring-white/5"
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

      <div className="text-3xl font-bold mt-4">
        {loading ? "…" : `$${totalUsd.toLocaleString()}`}
      </div>

      <div className="text-xs text-white/60 mt-2 flex flex-col">
        <span className="font-medium">{assetsLabel}</span>

        {change24hValue !== null && (
          <span className={`${changeTone} mt-0.5`}>
            {change24hValue >= 0 ? "▲" : "▼"}{" "}
            {change24hValue.toFixed(2)}% 24h
          </span>
        )}
      </div>

      {/* Placeholder sparkline */}
      <div className="mt-4 h-8 w-full">
        <svg
          className="w-full h-full"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
        >
          <path
            d="M0 18 Q25 10, 50 15 T100 5"
            fill="none"
            stroke={sparkStroke}
            strokeWidth="1.5"
            opacity="0.5"
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
      className="rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex flex-col items-center justify-center py-6 px-4 min-w-[120px] backdrop-blur-lg shadow-2xl snap-center ring-1 ring-white/5"
    >
      <div className="h-12 w-12 rounded-full bg-white/10 border border-white/20 grid place-items-center mb-2">
        {icon}
      </div>
      <div className="text-sm text-white/80">{label}</div>
    </button>
  );
}

function StatCard({
  k,
  v,
  sub,
}: {
  k: string;
  v: string;
  sub?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md shadow-2xl ring-1 ring-white/5">
      <div className="text-xs text-white/60">{k}</div>
      <div className="text-lg font-bold mt-2">{v}</div>
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
      <div className="text-lg font-semibold mt-2">{value}</div>
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
      {value && (
        <div className="text-xl font-bold">{value}</div>
      )}
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
        className="absolute right-0 top-0 h-full w-full sm:w-[640px] bg-[#0F1622] border-l border-white/20 shadow-[0_12px_48px_rgba(0,0,0,0.7)]"
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
        <div className="p-6 overflow-y-auto h-[calc(100%-64px)]">
          {children}
        </div>
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

  // Hard guard: never show provider as title; use subtitle or "Unknown"
  const rawTitle = (t.title || "").trim();
  const titleText =
    !rawTitle || isProviderLabel(rawTitle)
      ? t.subtitle || "Unknown"
      : rawTitle;

  // Hide duplicate subtitle if it equals title (case-insensitive)
  const showSubtitle =
    t.subtitle &&
    t.subtitle.trim().toLowerCase() !== titleText.trim().toLowerCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center justify-between px-6 py-5 hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`h-10 w-10 rounded-2xl grid place-items-center border shrink-0 ${
            isIncome
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {isIncome ? (
            <ArrowDownLeft size={18} />
          ) : (
            <ArrowUpRight size={18} />
          )}
        </div>

        <div className="min-w-0">
          <div className="text-base font-semibold truncate max-w-[220px] sm:max-w-[320px]">
            {titleText}
          </div>

          <div className="text-sm text-white/60 truncate">
            {railLabel} • {t.account} •{" "}
            {date.toLocaleDateString()}
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

      <div
        className={`text-base font-bold tabular-nums text-right shrink-0 ${
          isIncome ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {isIncome ? "+" : "−"}
        {fmtMoney(Math.abs(t.amount))}
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
        <SummaryCard
          label="Net (last 30d)"
          value={fmtMoney(last30.net)}
        />
      </div>

      <div className="md:sticky md:top:[64px] z-[5] -mx-6 px-6 py-4 bg-[#0F1622]/95 backdrop-blur-md border-y border-white/20 shadow-md">
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
                <TxnRow
                  key={t.id}
                  t={t}
                  onClick={() => onOpenTxn(t)}
                />
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
      <div className={`text-2xl font-bold mt-2 ${toneClass}`}>
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
    {
      key: "all" as const,
      label: "All",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      key: "sent" as const,
      label: "Sent",
      icon: <ArrowUpRight className="h-5 w-5" />,
    },
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
          <div className="flex-1">
            <div className="text-sm font-medium">{a.title}</div>
            <div className="text-xs text-white/60 mt-0.5">
              {new Date(a.createdAt || Date.now()).toLocaleString()} •{" "}
              {a.kind}
              {a.type ? ` • ${a.type}` : ""}{" "}
              {a.to ? ` • ${a.to}` : ""}{" "}
              {a.amount ? ` • ${a.amount}` : ""}{" "}
              {a.ref ? ` • Ref ${a.ref}` : ""}
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
            {last4
              ? `•••• •••• •••• ${last4}`
              : "•••• •••• •••• ••••"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between text-xs relative">
        <div className="space-y-1">
          <div className="text-white/50 text-[11px]">Card holder</div>
          <div className="text-sm font-semibold">
            {holder || "Horizon User"}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-white/50 text-[11px]">Expires</div>
          <div className="font-mono text-sm tracking-[0.2em]">
            12/28
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/60 uppercase">
            {network || "Visa"}
          </div>
          <div className="text-lg font-semibold tracking-[0.15em]">
            VISA
          </div>
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

  const xs = points.map((_, i) =>
    points.length === 1
      ? width / 2
      : padX +
        ((width - padX * 2) * i) / (points.length - 1)
  );
  const ys = points.map((v, i) => {
    const normalized = (v - min) / span;
    return padY + (h - padY * 2) * (1 - normalized);
  });

  const lineD = points
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys[i]}`)
    .join(" ");

  const areaD =
    `M ${xs[0]} ${h - padY} ` +
    points
      .map((_, i) => `L ${xs[i]} ${ys[i]}`)
      .join(" ") +
    ` L ${xs[xs.length - 1]} ${h - padY} Z`;

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${h}`}
        className="w-full h-[70%]"
        preserveAspectRatio="none"
      >
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
          <circle
            key={i}
            cx={x}
            cy={ys[i]}
            r={1.5}
            fill="#00E0FF"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-white/50">
        {points.map((p, i) => (
          <span
            key={`${p.label}-${i}`}
            className="truncate"
          >
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
function maskCard(card?: string) {
  if (!card) return "";
  const digits = card.replace(/\D/g, "");
  if (!digits) return card;
  const groups = digits.padStart(16, "•").match(/.{1,4}/g);
  return (groups || []).join(" ");
}

function last4FromCard(card?: string, fallback?: string) {
  if (fallback) return fallback;
  if (!card) return "";
  const digits = card.replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-4);
}
