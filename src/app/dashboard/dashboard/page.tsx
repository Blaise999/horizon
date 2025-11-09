// app/dashboard/page.tsx — Horizon (INTELLIGENT TXNS + INSIGHTS)
// - Direction-aware counterparty resolution (origin vs beneficiary)
// - Deep fallbacks for name/handle/bank last4, incl. provider meta blocks
// - Provider names never appear as bold title; they live in subtitle only
// - Real 30d stats, YTD, cleaner UI

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
} from "lucide-react";
import { useRouter } from "next/navigation";
import API, { request } from "@/libs/api";
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
  title: string;           // human name/handle — never provider
  subtitle?: string;       // handle/email/phone or Acct••••
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
  return [a.street1, a.street2, cityState, a.postalCode, a.country].filter(Boolean).join(" • ");
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
  (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));

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
    input?.amount?.value ?? input?.amountValue ?? input?.amount ?? input?.meta?.amount ?? 0;
  const amt = num(rawAmt);
  let direction: "sent" | "received";
  if (typeof input?.direction === "string") {
    const d = String(input.direction).toLowerCase();
    direction = d === "credit" || d === "received" ? "received" : "sent";
  } else {
    direction = amt < 0 ? "sent" : "received";
  }
  const signed = direction === "sent" ? -Math.abs(Math.abs(amt)) : Math.abs(Math.abs(amt));

  // 2) Rail
  const rail = (input?.rail as string | undefined) || (input?.meta?.rail as string | undefined);

  // 3) Counterparty (direction-aware)
  const { partyName, partyHandle, bankLast4 } = pickParty(input, direction);

  // Name: drop provider-like strings
  const nameHuman = partyName && !isProviderLabel(partyName) ? partyName : undefined;

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
  const merchantRaw = (input?.merchant && String(input.merchant).trim()) || undefined;
  const merchantHuman = merchantRaw && !isProviderLabel(merchantRaw) ? merchantRaw : undefined;

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
    subtitle = railPretty && railPretty.toLowerCase() !== title.toLowerCase() ? railPretty : undefined;
  }

  // 6) Account kind
  const account: TxnRowUnified["account"] =
    (input?.accountType as any) ||
    (rail &&
    ["crypto", "crypto_buy", "crypto_swap", "crypto_send", "crypto_receive"].includes(
      String(rail).toLowerCase()
    )
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
    input?.date || input?.createdAt || input?.meta?.createdAt || new Date().toISOString();
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
  const [btcAmountBase, setBtcAmountBase] = useState<number>(0);

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

        const baseFromMirror = Number(user?.balances?.cryptoBTC ?? 0);
        const baseFromHoldings = Number(user?.balances?.cryptoHoldings?.bitcoin?.amount ?? 0);
        const legacyUsd = Number(user?.balances?.cryptoUSD ?? 0);
        const legacyPx = Number((user?.balances?.btcPrice as any) ?? 0);
        const baseFromLegacy = legacyUsd > 0 && legacyPx > 0 ? legacyUsd / legacyPx : 0;
        setBtcAmountBase(baseFromMirror || baseFromHoldings || baseFromLegacy || 0);

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
          const normalized = raw.map((row) => normalizeTx(row)).filter(Boolean) as TxnRowUnified[];
          normalized.sort((a, b) => +new Date(b.date) - +new Date(a.date));
          setTxns(normalized);
        } catch (e) {
          console.warn("txns fetch error", e);
        }

        // Notifications
        try {
          const acts = await request<{ items: any[] }>("/users/me/activities");
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

  const total = useMemo(() => checkingBalance + savingsBalance, [checkingBalance, savingsBalance]);

  const { perAsset, loading: priceLoading } = useLiveCrypto({
    ids: ["bitcoin"],
    amounts: { bitcoin: btcAmountBase },
    pollMs: 15000,
  });
  const livePrice = perAsset?.bitcoin?.price ?? 0;
  const liveUsd = perAsset?.bitcoin?.usdValue ?? 0;
  const change24h = perAsset?.bitcoin?.change24h;

  const byMonth = useMemo(() => aggregateByMonth(txns), [txns]);
  const ytd = useMemo(() => aggregateYtd(txns), [txns]);

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
  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }
  function handleAvatarRemove() {
    setProfileAvatar(null);
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
      />

      {/* Hero / balances */}
      <section className="pt-[120px] container-x">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            <div className="text-base text-white/70">Welcome back,</div>
            <div className="text-3xl font-bold mt-1">{userName || "User"}</div>
            <div className="mt-6 text-base text-white/80">Total Balance</div>
            <div className="text-5xl md:text-6xl font-bold mt-1 tracking-tight">
              ${total.toLocaleString()}
            </div>
            <div className="text-sm text-white/60 mt-2">Checking + Savings</div>
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 flex items-center gap-2 shadow-md transition-all"
                onClick={openQuickAddMoney}
              >
                <Plus size={16} /> Add money
              </button>
              <button
                className="px-5 py-3 rounded-2xl bg-[#00E0FF]/15 border border-[#00E0FF]/40 flex items-center gap-2 shadow-md transition-all"
                onClick={openQuickTransfer}
              >
                <ArrowUpRight size={16} /> Transfer
              </button>
              <button
                className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 flex items-center gap-2 shadow-md transition-all"
                onClick={openInsights}
              >
                <BarChart3 size={16} /> Insights
              </button>
            </div>
          </div>

          {/* Accounts */}
          <div className="grid sm:grid-cols-3 gap-5">
            <AccountCard
              label="Checking"
              balance={checkingBalance}
              color="#00E0FF"
              icon={<Wallet size={20} />}
              onClick={openCardsManager}
            />
            <AccountCard
              label="Savings"
              balance={savingsBalance}
              color="#33D69F"
              icon={<PiggyBank size={20} />}
              onClick={openCardsManager}
            />
            <CryptoCard
              label="Crypto"
              color="#F7931A"
              icon={<Bitcoin size={20} />}
              btcAmount={btcAmountBase}
              usdValue={liveUsd}
              price={livePrice}
              change24h={change24h}
              loading={priceLoading}
              onClick={openCrypto}
            />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="container-x mt-12">
        <div className="text-base text-white/80 mb-4">Quick actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ActionTile icon={<ArrowUpRight />} label="Transfer" onClick={openQuickTransfer} />
          <ActionTile icon={<Plus />} label="Add money" onClick={openQuickAddMoney} />
          <ActionTile icon={<CreditCard />} label="Pay bills" onClick={openPayBills} />
          <ActionTile icon={<BarChart3 />} label="Insights" onClick={openInsights} />
        </div>
      </section>

      {/* Insights */}
      <section className="container-x mt-14">
        <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-8 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Spending & Income</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/20"
                title="Previous month"
              >
                ‹
              </button>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20">
                <Calendar className="h-4 w-4 opacity-70" />
                <span className="text-sm">{monthLabel}</span>
              </div>
              <button
                onClick={nextMonth}
                className="px-3 py-2 rounded-xl bg白/10 border border-white/20"
                title="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mt-6">
            <InsightStat label="Sent (this month)" value={fmtMoney(monthSentRecv.sent)} trend="—" />
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

          <div className="grid sm:grid-cols-2 gap-5 mt-6">
            <StatCard k="YTD Sent" v={fmtMoney(ytd.sent)} sub="Year-to-date total outflows" />
            <StatCard k="YTD Received" v={fmtMoney(ytd.received)} sub="Year-to-date total inflows" />
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="container-x mt-14 pb-32">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <button
            onClick={openTransactions}
            className="text-base text-[#00E0FF] hover:underline flex items-center gap-2 transition-all"
          >
            Open full feed <ArrowRight size={16} />
          </button>
        </div>
        <div className="rounded-3xl border border-white/20 bg-white/[0.04] divide-y divide-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {txns.slice(0, 5).length === 0 ? (
            <div className="p-8 text-center text-white/70">No transactions yet.</div>
          ) : (
            txns.slice(0, 5).map((t) => <TxnRow key={t.id} t={t} />)
          )}
        </div>
      </section>

      {/* Floating Notifications button */}
      <button
        onClick={() => setShowNotifications(true)}
        title="Notifications"
        className="fixed right-5 bottom-5 h-12 w-12 rounded-2xl bg-white/10 border border-white/20 grid place-items-center shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-white/15"
      >
        <Bell size={18} />
      </button>

      {/* ----------------------------- MODALS ----------------------------- */}
      <Sheet open={showAccounts} onClose={() => setShowAccounts(false)} title="Accounts">
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
          <InfoRow icon={<Bitcoin size={18} />} label="Crypto" value={`$${liveUsd.toLocaleString()}`} />

          <div className="h-px bg-white/20 my-3" />

          <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5">
            <div className="text-base font-semibold mb-3">Account details</div>
            <KeyVal k="Routing number" v={routingNumber || "—"} />
            <KeyVal k="Account number" v={maskAccount(accountNumber) || "—"} />
            <KeyVal
              k="Virtual card"
              v={
                cardNumber ? maskCard(cardNumber) : cardLast4 ? `•••• •••• •••• ${cardLast4}` : "—"
              }
            />
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

      <Sheet open={showTransactions} onClose={() => setShowTransactions(false)} title="Transactions">
        <TransactionsPanel txns={txns} />
      </Sheet>

      <Sheet open={showAnalytics} onClose={() => setShowAnalytics(false)} title="Spending Insights">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-5">
            <StatCard k="This month Sent" v={fmtMoney(monthSentRecv.sent)} sub="Outflows this month" />
            <StatCard
              k="This month Received"
              v={fmtMoney(monthSentRecv.received)}
              sub="Inflows this month"
            />
            <StatCard k="YTD Net" v={fmtMoney(ytd.received - ytd.sent)} sub="Income − Spend" />
            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-base text-white/80 mb-3 font-semibold">Top categories</div>
              <ul className="space-y-3 text-base text-white/60">
                <li>Transfer</li>
              </ul>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-4 font-semibold">Monthly trend</div>
            <div className="text-white/60 text-sm">Charts coming soon.</div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-4 font-semibold">Rail split</div>
            <div className="text-white/60 text-sm">Breakdown by PayPal / Zelle / ACH coming soon.</div>
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
        <div className="grid lg:grid-cols-[320px,1fr] gap-8">
          {/* Profile quick card */}
          <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="text-base text-white/80 mb-4 font-semibold">Profile</div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-2xl overflow-hidden bg-white/15 border border-white/20 grid place-items-center shadow-md">
                  {profileAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileAvatar} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User size={28} className="text-white/70" />
                  )}
                </div>
                <button
                  onClick={handlePickAvatar}
                  className="absolute -bottom-3 -right-3 h-10 w-10 rounded-2xl bg-white/15 border border-white/20 grid place-items-center shadow-md transition-all"
                  title="Change photo"
                >
                  <Camera size={18} />
                </button>
              </div>
              <div className="text-base">
                <div className="font-semibold">
                  {profileFirst || "—"} {profileLast}
                </div>
                <div className="text-white/70">{profileEmail || "you@example.com"}</div>
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
                className="mt-4 inline-flex items-center gap-3 text-sm text-rose-300 hover:underline transition-all"
              >
                <Trash2 size={16} /> Remove photo
              </button>
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

          {/* Right-side placeholders */}
          <div className="space-y-8">
            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-base text-white/80 mb-4 font-semibold">Change password</div>
              <div className="text-white/60 text-sm">Coming soon.</div>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="text-base text-white/80 mb-4 font-semibold">Two-factor authentication</div>
              <div className="text-white/60 text-sm">Coming soon.</div>
            </div>
          </div>
        </div>
      </Sheet>

      {/* Notifications */}
      <Sheet open={showNotifications} onClose={() => setShowNotifications(false)} title="Notifications">
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
      className="text-left rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-white/[0.06] active:scale-[.99] transition"
    >
      <div className="flex items-center gap-3 text-base text-white/80">
        <div className="h-8 w-8 rounded-xl border border-white/20 grid place-items-center" style={{ color }}>
          {icon}
        </div>
        {label}
      </div>
      <div className="text-3xl font-bold mt-3">${balance.toLocaleString()}</div>
      {subtitle && <div className="text-sm text-white/60 mt-1">{subtitle}</div>}
    </button>
  );
}

/** CryptoCard — BTC amount is the base; USD is big visually and updates live. */
function CryptoCard({
  label,
  color,
  icon,
  btcAmount,
  usdValue,
  price,
  change24h,
  loading,
  onClick,
}: {
  label: string;
  color: string;
  icon: ReactNode;
  btcAmount: number;
  usdValue: number;
  price: number;
  change24h?: number;
  loading?: boolean;
  onClick?: () => void;
}) {
  const changeTone =
    typeof change24h === "number" ? (change24h >= 0 ? "text-emerald-400" : "text-rose-400") : "text-white/60";

  return (
    <button
      onClick={onClick}
      className="text-left rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-white/[0.06] active:scale-[.99] transition"
    >
      <div className="flex items-center gap-3 text-base text-white/80">
        <div className="h-8 w-8 rounded-xl border border-white/20 grid place-items-center" style={{ color }}>
          {icon}
        </div>
        {label}
      </div>
      <div className="text-3xl font-bold mt-3">{loading ? "…" : `$${usdValue.toLocaleString()}`}</div>
      <div className="text-sm text-white/80 mt-1 flex flex-col">
        <span className="font-medium">Base: {btcAmount ? btcAmount.toFixed(8) : "0.00000000"} BTC</span>
        <span className="text-white/60">{loading ? "Updating…" : `@ $${price.toLocaleString()} / BTC`}</span>
        {typeof change24h === "number" && (
          <span className={`${changeTone} mt-0.5`}>{change24h >= 0 ? "▲" : "▼"} {change24h.toFixed(2)}% 24h</span>
        )}
      </div>
    </button>
  );
}

function ActionTile({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-3xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.06] active:scale-[.98] transition flex flex-col items-center justify-center py-6 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/20 grid place-items-center mb-3">
        {icon}
      </div>
      <div className="text-base text-white/90">{label}</div>
    </button>
  );
}

function StatCard({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="text-sm text-white/70">{k}</div>
      <div className="text-xl font-bold mt-2">{v}</div>
      {sub && <div className="text-sm text-white/60 mt-2">{sub}</div>}
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
    <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="text-sm text-white/70">{label}</div>
      <div className="text-xl font-semibold mt-2">{value}</div>
      <div
        className={`text-sm mt-2 ${
          positive === undefined ? "text-white/60" : positive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {trend}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: ReactNode; label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5 flex items-center justify-between backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3 text-base text-white/90">
        {icon} {label}
      </div>
      {value && <div className="text-xl font-bold">{value}</div>}
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

function Row({ label, action, icon }: { label: string; action?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3 text-base text-white/90">
        {icon} {label}
      </div>
      {action && <button className="text-base text-[#00E0FF] hover:underline transition-all">{action}</button>}
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
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
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
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function TxnRow({ t }: { t: TxnRowUnified }) {
  const isIncome = t.amount > 0;
  const date = new Date(t.date);
  const railLabel = prettyRail(t.rail) ?? "Transfer";

  // Hard guard: never show provider as title; use subtitle or "Unknown"
  const rawTitle = (t.title || "").trim();
  const titleText =
    !rawTitle || isProviderLabel(rawTitle) ? t.subtitle || "Unknown" : rawTitle;

  // Hide duplicate subtitle if it equals title (case-insensitive)
  const showSubtitle =
    t.subtitle &&
    t.subtitle.trim().toLowerCase() !== titleText.trim().toLowerCase();

  return (
    <div className="flex items-center justify-between px-6 py-5 hover:bg-white/[0.04] transition-all">
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
          <div className="text-base font-semibold truncate max-w-[220px] sm:max-w-[320px]">
            {titleText}
          </div>

          <div className="text-sm text-white/60 truncate">
            {railLabel} • {t.account} • {date.toLocaleDateString()}
          </div>

          {showSubtitle && (
            <div className="text-xs text-white/60 mt-0.5 truncate">{t.subtitle}</div>
          )}
          {t.note && (
            <div className="text-xs text-white/50 mt-0.5 truncate">Note: {t.note}</div>
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
    </div>
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

function TransactionsPanel({ txns }: { txns: TxnRowUnified[] }) {
  const [tab, setTab] = useState<"sent" | "received" | "all">("all");

  let rows = txns.filter((t) =>
    tab === "all" ? true : tab === "received" ? t.amount > 0 : t.amount < 0
  );
  rows = rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const last30 = useMemo(() => totalsLastNDays(txns, 30), [txns]);
  const grouped = groupByDate(rows);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <SummaryCard label="Sent (last 30d)" value={fmtMoney(last30.sent)} tone="sent" />
        <SummaryCard label="Received (last 30d)" value={fmtMoney(last30.received)} tone="received" />
        <SummaryCard label="Net (last 30d)" value={fmtMoney(last30.net)} />
      </div>

      <div className="md:sticky md:top:[64px] z-[5] -mx-6 px-6 py-4 bg-[#0F1622]/95 backdrop-blur-md border-y border-white/20 shadow-md">
        <div className="flex items-center justify-center">
          <TabPills current={tab} onChange={setTab} />
        </div>
      </div>

      <div className="rounded-3xl border border-white/20 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {grouped.length === 0 ? (
          <div className="p-12 text-center text-white/70 text-base">No transactions.</div>
        ) : (
          grouped.map(([dateLabel, items]) => (
            <div key={dateLabel} className="bg-white/[0.03]">
              <div className="px-6 pt-5 pb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-white/10 border border-white/20 text-white/70">
                  {dateLabel}
                </span>
              </div>
              {items.map((t) => (
                <TxnRow key={t.id} t={t} />
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
      <div className={`text-2xl font-bold mt-2 ${toneClass}`}>{value}</div>
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
    { key: "received" as const, label: "Received", icon: <ArrowDownLeft className="h-5 w-5" /> },
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
              active ? "bg-[#00E0FF]/15 border-[#00E0FF]/40" : "bg-white/10 border-white/20 hover:bg-white/[0.12]"
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
              {new Date(a.createdAt || Date.now()).toLocaleString()} • {a.kind}
              {a.type ? ` • ${a.type}` : ""} {a.to ? ` • ${a.to}` : ""} {a.amount ? ` • ${a.amount}` : ""}{" "}
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
