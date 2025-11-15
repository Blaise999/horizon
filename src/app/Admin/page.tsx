"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import {
  Check,
  X,
  Clock,
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  RefreshCcw,
  ShieldCheck,
  Wallet,
  PiggyBank,
  Bitcoin,
  CreditCard,
  Bell,
  Filter,
  Search,
  ChevronDown,
  Users,
  KeyRound,
  Database,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
  SendHorizonal,
  Download,
} from "lucide-react";
import { useRouter } from "next/navigation";
// ✅ Correct: your API client lives at src/libs/api.ts
import { request } from "@/libs/api";
import { serverRequest } from "@/libs/server-api";

/* -----------------------------------------------------------------------------
  Types
----------------------------------------------------------------------------- */

type AccountType = "Checking" | "Savings" | "Crypto";
type TxCategory =
  | "Income"
  | "Transfer"
  | "Bills"
  | "Dining"
  | "Groceries"
  | "Transport"
  | "Shopping"
  | "Refund"
  | "Subscriptions"
  | "Housing"
  | "Crypto";

type Direction = "sent" | "received";

type CryptoInfo = {
  symbol: string;
  amount: number;
  usdAtExecution: number;
  direction: Direction;
};

type Txn = {
  id: string;
  date: string; // ISO
  merchant: string;
  category: TxCategory;
  amount: number; // + income, - spend
  account: AccountType;
  direction?: Direction; // derived for UI
  crypto?: CryptoInfo;
};

type QueueStatus = "pending" | "approved" | "rejected" | "on_hold";

type QueueItem = {
  id: string;
  createdAt: string; // ISO
  rail:
    | "wire_international"
    | "ach_domestic"
    | "zelle"
    | "revolut"
    | "paypal"
    | "wise"
    | "venmo"
    | "wechat"
    | "alipay"
    | "cashapp"
    | "crypto";
  fromAccount: AccountType;
  toLabel: string;
  note?: string;
  amountUSD: number;
  crypto?: CryptoInfo;
  status: QueueStatus;
};

type AdminCryptoHolding = {
  amount?: number | string;
  lastUsdPrice?: number | string;
  updatedAt?: string | Date;
};

type AdminBalances = {
  checking?: number;
  savings?: number;
  cryptoUSD?: number;
  btcPrice?: number;
  cryptoBTC?: number;
  cryptoHoldings?: Record<string, AdminCryptoHolding>;
};

type LocalHolding = {
  amount: number;
  lastUsdPrice?: number;
  updatedAt?: string | Date;
};

/** Admin users list response */
type AdminUser = {
  _id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  balances?: AdminBalances;
};

/* -----------------------------------------------------------------------------
  Utils (namespaced storage per userId) — kept as fallback
----------------------------------------------------------------------------- */

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const LAST_USER_ID_KEY = "hb_last_user_id";
const tabList = ["queue", "balances", "transactions", "insights", "populate"] as const;
type Tab = (typeof tabList)[number];

const k = (userId: string, base: string) => `${userId}:${base}`;

function nsGet<T>(userId: string, baseKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k(userId, baseKey));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function nsSet(userId: string, baseKey: string, value: unknown) {
  localStorage.setItem(k(userId, baseKey), JSON.stringify(value));
}
function pushActivity(userId: string, a: Record<string, unknown>) {
  const arr = nsGet<any[]>(userId, "hb_notifications", []);
  arr.unshift({
    id: (a as any).id || uid("act"),
    createdAt: new Date().toISOString(),
    ...a,
  });
  nsSet(userId, "hb_notifications", arr.slice(0, 400));
}
function readTxnsLS(userId: string): Txn[] {
  return nsGet<Txn[]>(userId, "hb_txns", []);
}
function writeTxnsLS(userId: string, next: Txn[]) {
  nsSet(userId, "hb_txns", next);
}
function adjustBalancesLS(
  userId: string,
  deltaChecking = 0,
  deltaSavings = 0,
  deltaCryptoUSD = 0
) {
  const c = Number(localStorage.getItem(k(userId, "hb_acc_checking_bal")) || "0");
  const s = Number(localStorage.getItem(k(userId, "hb_acc_savings_bal")) || "0");
  const u = Number(localStorage.getItem(k(userId, "hb_acc_crypto_usd")) || "0");
  localStorage.setItem(k(userId, "hb_acc_checking_bal"), String(c + deltaChecking));
  localStorage.setItem(k(userId, "hb_acc_savings_bal"), String(s + deltaSavings));
  localStorage.setItem(k(userId, "hb_acc_crypto_usd"), String(u + deltaCryptoUSD));
}
const defaultCrypto = (btcPrice: number): CryptoInfo => ({
  symbol: "BTC",
  amount: 0,
  usdAtExecution: btcPrice || 0,
  direction: "sent",
});
const materializeCrypto = (maybe: CryptoInfo | undefined, btcPrice: number): CryptoInfo =>
  maybe ?? defaultCrypto(btcPrice);

const ensureSigned = (absAmount: number, direction: Direction) =>
  direction === "sent" ? -Math.abs(absAmount) : Math.abs(absAmount);

/* -----------------------------------------------------------------------------
  Mappers from API → UI shape
----------------------------------------------------------------------------- */

function mapTxnFromAPI(x: any): Txn {
  const dec = (x?.amount && (x.amount.$numberDecimal ?? x.amount)) ?? 0;
  const amount = typeof dec === "string" ? parseFloat(dec) : Number(dec);
  const direction: Direction = amount < 0 ? "sent" : "received"; // derive if missing

  return {
    id: String(x._id || x.id),
    date: new Date(x.date || x.postedAt || x.createdAt || Date.now()).toISOString(),
    merchant: String(x.merchant || x.description || "Transaction"),
    category: (x.category || "Transfer") as TxCategory,
    amount,
    account: (x.accountType || x.account || "Checking") as AccountType,
    direction,
    crypto: x.meta?.crypto
      ? {
          symbol: String(x.meta.crypto.symbol || "BTC"),
          amount: Number(x.meta.crypto.qty ?? x.meta.crypto.amount ?? 0),
          usdAtExecution: Number(x.meta.crypto.usd ?? x.meta.crypto.usdAtExecution ?? 0),
          direction: (x.meta.crypto.side === "sell" ? "sent" : "received") as Direction,
        }
      : undefined,
  };
}
function mapQueueFromAPI(x: any): QueueItem {
  return {
    id: String(x._id || x.id),
    createdAt: new Date(x.createdAt || x.executedAt || Date.now()).toISOString(),
    rail: x.rail,
    fromAccount: x.fromAccount,
    toLabel: x.toLabel,
    note: x.note,
    amountUSD: Number(x.amountUSD),
    crypto: x.crypto
      ? {
          symbol: x.crypto.symbol,
          amount: Number(x.crypto.amount || 0),
          usdAtExecution: Number(x.crypto.usdAtExecution || 0),
          direction: (x.crypto.direction || "sent") as Direction,
        }
      : undefined,
    status: x.status,
  };
}

/* -----------------------------------------------------------------------------
  Page
----------------------------------------------------------------------------- */

export default function AdminPage() {
  const router = useRouter();

  // Users dropdown state (fetched from backend)
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string>("");

  // Active user the admin is operating on
  const [userId, setUserId] = useState<string>("");
  const [userIdSelect, setUserIdSelect] = useState<string>("");

  // UI Tabs
  const [tab, setTab] = useState<Tab>("queue");

  // Balances
  const [checking, setChecking] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [cryptoUSD, setCryptoUSD] = useState<number>(0);
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [cryptoHoldings, setCryptoHoldings] = useState<Record<string, LocalHolding>>({});
  const [newAssetSymbol, setNewAssetSymbol] = useState<string>("");

  // Queue + Txns
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [q, setQ] = useState("");

  // Insights (kept local-only for now, unless you add an API)
  const [insSpent, setInsSpent] = useState<string>("");
  const [insIncome, setInsIncome] = useState<string>("");
  const [insTopCat, setInsTopCat] = useState<string>("");

  // Drafts — Transactions tab (manual create)
  const [draft, setDraft] = useState<Partial<Txn>>({
    date: new Date().toISOString().slice(0, 10),
    account: "Checking",
    category: "Transfer",
    direction: "sent",
  });

  // Drafts — Queue tab (new queue item)
  const [qdraft, setQdraft] = useState<
    Partial<QueueItem> & { executedAt?: string; direction?: Direction }
  >({
    rail: "ach_domestic",
    fromAccount: "Checking",
    amountUSD: 50,
    toLabel: "Recipient",
    executedAt: new Date().toISOString().slice(0, 10),
    direction: "sent",
  });

  // Populate tab (server-powered range injector)
  const [seedCount, setSeedCount] = useState<number>(25); // legacy quick seeder
  const [injCurrency, setInjCurrency] = useState<string>("USD");

  const [injSentCount, setInjSentCount] = useState<number>(0);
  const [injSentStart, setInjSentStart] = useState<string>("");
  const [injSentEnd, setInjSentEnd] = useState<string>("");
  const [injSentMin, setInjSentMin] = useState<number>(10);
  const [injSentMax, setInjSentMax] = useState<number>(300);

  const [injRecvCount, setInjRecvCount] = useState<number>(0);
  const [injRecvStart, setInjRecvStart] = useState<string>("");
  const [injRecvEnd, setInjRecvEnd] = useState<string>("");
  const [injRecvMin, setInjRecvMin] = useState<number>(20);
  const [injRecvMax, setInjRecvMax] = useState<number>(600);

  /* ---------------------------- Load users list ---------------------------- */

  async function refreshUsersList() {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const data = await request<any>("/admin/users", { method: "GET" });
      // Accept either {items} or {users}
      const raw: any[] = (data?.items ?? data?.users ?? []) as any[];

      // Normalize: add fullName from first/last if present
      const list: AdminUser[] = raw.map((u: any) => {
        const first = u.firstName ?? u.identity?.name?.firstName ?? "";
        const last = u.lastName ?? u.identity?.name?.lastName ?? "";
        const fullName = [first, last].filter(Boolean).join(" ");
        return {
          _id: String(u._id),
          email: u.email ?? "",
          firstName: first || undefined,
          lastName: last || undefined,
          fullName: u.fullName ?? (fullName || undefined),
          balances: u.balances ?? {},
        };
      });

      list.sort((a, b) => {
        const la = (a.fullName || a.email || "").toLowerCase();
        const lb = (b.fullName || b.email || "").toLowerCase();
        return la.localeCompare(lb);
      });

      setUsers(list);

      // keep/choose active
      const last = localStorage.getItem(LAST_USER_ID_KEY) || "";
      const exists = list.some((u) => u._id === last);
      const nextId = exists ? last : (list[0]?._id || "");
      setUserId(nextId);
      setUserIdSelect(nextId);
    } catch (e: any) {
      setUsersError(e?.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    refreshUsersList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------- Load per-user data on select ---------------------- */

  const fetchBalancesForUser = useCallback(
    (id: string) => {
      const found = users.find((u) => u._id === id);
      const b = found?.balances || {};

      setChecking(Number(b.checking || 0));
      setSavings(Number(b.savings || 0));
      setCryptoUSD(Number(b.cryptoUSD || 0));
      setBtcPrice(Number(b.btcPrice || 0));

      // Normalize cryptoHoldings -> local holdings map
      const src = (b.cryptoHoldings || {}) as Record<string, AdminCryptoHolding>;
      const nextHoldings: Record<string, LocalHolding> = {};
      Object.entries(src).forEach(([assetId, row]) => {
        if (!row) return;
        const amtRaw = row.amount ?? 0;
        const amt =
          typeof amtRaw === "string" ? parseFloat(amtRaw) : Number(amtRaw || 0);
        if (!Number.isFinite(amt) || amt === 0) return;

        const pxRaw = row.lastUsdPrice ?? 0;
        const px =
          typeof pxRaw === "string" ? parseFloat(pxRaw) : Number(pxRaw || 0);

        nextHoldings[assetId] = {
          amount: amt,
          lastUsdPrice: Number.isFinite(px) && px > 0 ? px : undefined,
          updatedAt: row.updatedAt,
        };
      });
      setCryptoHoldings(nextHoldings);

      if (found?.balances) {
        return true;
      }

      // Fallback to LS (legacy demo)
      setChecking(Number(localStorage.getItem(k(id, "hb_acc_checking_bal")) || "0"));
      setSavings(Number(localStorage.getItem(k(id, "hb_acc_savings_bal")) || "0"));
      setCryptoUSD(Number(localStorage.getItem(k(id, "hb_acc_crypto_usd")) || "0"));
      setBtcPrice(Number(localStorage.getItem(k(id, "hb_btc_price")) || "0"));
      setCryptoHoldings({});
      return false;
    },
    [users]
  );

  const fetchTxnsForUser = useCallback(
    async (id: string) => {
      try {
        const data = await request<{ ok: boolean; txns?: any[]; items?: any[] }>(
          `/admin/users/${id}/transactions`,
          { method: "GET" }
        );
        const rows = (data.items ?? data.txns ?? []) as any[];
        const mapped = rows.map(mapTxnFromAPI);
        setTxns(mapped);
        writeTxnsLS(id, mapped);
        return true;
      } catch {
        const ls = readTxnsLS(id);
        setTxns(ls);
        return false;
      }
    },
    []
  );

  const tryFetchQueue = useCallback(
    async (id: string) => {
      // If you add GET /admin/queue?userId=xxx later, this will just work.
      try {
        const data = await request<{ ok: boolean; items: any[] }>(
          `/admin/queue?userId=${encodeURIComponent(id)}`,
          { method: "GET" }
        );
        const mapped = (data.items || []).map(mapQueueFromAPI);
        setQueue(mapped);
        nsSet(id, "hb_admin_queue", mapped);
        return true;
      } catch {
        setQueue(nsGet<QueueItem[]>(id, "hb_admin_queue", []));
        return false;
      }
    },
    []
  );

  const loadUserData = useCallback(
    async (id: string) => {
      if (!id) return;
      fetchBalancesForUser(id);
      await fetchTxnsForUser(id);
      await tryFetchQueue(id);

      setInsSpent(localStorage.getItem(k(id, "hb_insights_spent")) || "");
      setInsIncome(localStorage.getItem(k(id, "hb_insights_income")) || "");
      setInsTopCat(localStorage.getItem(k(id, "hb_insights_topcat")) || "");
    },
    [fetchBalancesForUser, fetchTxnsForUser, tryFetchQueue]
  );

  useEffect(() => {
    if (!userId) return;
    loadUserData(userId);
  }, [userId, loadUserData]);

  const total = useMemo(() => checking + savings, [checking, savings]);

  /* ------------------------------- User Scope ------------------------------ */

  function applyUserSelection() {
    if (!userIdSelect) return;
    localStorage.setItem(LAST_USER_ID_KEY, userIdSelect);
    setUserId(userIdSelect);
    loadUserData(userIdSelect);
  }
  function clearUser() {
    setUserId("");
    setUserIdSelect("");
    setCryptoHoldings({});
  }

  /* ------------------------------ Save helpers ----------------------------- */

  async function saveBalances() {
    if (!userId) return;

    // Normalize cryptoHoldings → { [assetId]: { amount } }
    const normalizedHoldings: Record<string, { amount: number }> = {};
    Object.entries(cryptoHoldings).forEach(([assetId, row]) => {
      const key = assetId.trim().toLowerCase();
      const amt = Number(row.amount || 0);
      if (!Number.isFinite(amt) || amt === 0) return;
      normalizedHoldings[key] = { amount: amt };
    });

    const btcAmount = normalizedHoldings["bitcoin"]?.amount ?? 0;

    try {
      await request<{ ok: boolean; user: any }>(`/admin/users/${userId}/balances`, {
        method: "PATCH",
        body: {
          checking,
          savings,
          cryptoUSD,
          btcPrice,
          cryptoHoldings: normalizedHoldings,
          cryptoBTC: btcAmount,
        },
      });

      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                balances: {
                  ...(u.balances || {}),
                  checking,
                  savings,
                  cryptoUSD,
                  btcPrice,
                  cryptoBTC: btcAmount,
                  cryptoHoldings: normalizedHoldings,
                },
              }
            : u
        )
      );

      pushActivity(userId, {
        title: "Balances updated",
        kind: "admin",
        amount: `${money(checking)} / ${money(savings)} / ${money(cryptoUSD)}`,
        type: "balances",
      });
    } catch {
      // keep LS in sync as fallback
      localStorage.setItem(k(userId, "hb_acc_checking_bal"), String(checking));
      localStorage.setItem(k(userId, "hb_acc_savings_bal"), String(savings));
      localStorage.setItem(k(userId, "hb_acc_crypto_usd"), String(cryptoUSD));
      localStorage.setItem(k(userId, "hb_btc_price"), String(btcPrice));
    }
  }

  function writeQueueLS(next: QueueItem[]) {
    if (!userId) return;
    setQueue(next);
    nsSet(userId, "hb_admin_queue", next);
  }

  async function addQueueItem() {
    if (!userId) return;

    const execISO =
      qdraft.executedAt && qdraft.executedAt.length <= 10
        ? new Date(qdraft.executedAt + "T00:00:00.000Z").toISOString()
        : new Date(qdraft.executedAt || Date.now()).toISOString();

    // Direction and sign for non-crypto flows
    const dir: Direction = (qdraft.direction as Direction) || "sent";
    const baseAmount = Number(qdraft.amountUSD || 0);
    const signedAmount =
      qdraft.rail === "crypto" ? baseAmount : ensureSigned(baseAmount, dir);

    const payload: any = {
      userId,
      rail: (qdraft.rail || "ach_domestic") as QueueItem["rail"],
      fromAccount: (qdraft.fromAccount || "Checking") as AccountType,
      toLabel: qdraft.toLabel || "Recipient",
      note: qdraft.note || "",
      amountUSD: signedAmount,
      executedAt: execISO,
      direction: dir, // for server-side convenience
      crypto:
        qdraft.rail === "crypto"
          ? {
              symbol: qdraft.crypto?.symbol || "BTC",
              amount: Number(qdraft.crypto?.amount || 0),
              usdAtExecution: Number(qdraft.crypto?.usdAtExecution || btcPrice || 0),
              direction: (qdraft.crypto?.direction as Direction) || "sent",
            }
          : undefined,
    };

    try {
      const r = await request<{ ok: boolean; item: any }>(`/admin/queue`, {
        method: "POST",
        body: payload,
      });
      const saved = mapQueueFromAPI(r.item);
      writeQueueLS([saved, ...(queue || [])]);
    } catch {
      // Local fallback mirror
      const item: QueueItem = {
        id: uid("q"),
        createdAt: execISO,
        rail: payload.rail,
        fromAccount: payload.fromAccount,
        toLabel: payload.toLabel,
        note: payload.note,
        amountUSD: signedAmount,
        crypto: payload.crypto,
        status: "pending",
      };
      writeQueueLS([item, ...(queue || [])]);
    }

    setQdraft({
      rail: "ach_domestic",
      fromAccount: "Checking",
      amountUSD: 50,
      toLabel: "Recipient",
      executedAt: new Date().toISOString().slice(0, 10),
      direction: "sent",
    });
  }

  async function approve(item: QueueItem) {
    if (!userId) return;
    try {
      await request<{ ok: boolean; item: any }>(`/admin/queue/${item.id}`, {
        method: "PATCH",
        body: { status: "approved" },
      });
      await fetchTxnsForUser(userId);
      // Adjust local balances state
      if (item.fromAccount === "Checking") {
        setChecking((v) => v + item.amountUSD);
      } else if (item.fromAccount === "Savings") {
        setSavings((v) => v + item.amountUSD);
      } else if (item.fromAccount === "Crypto") {
        setCryptoUSD((v) => v + item.amountUSD);
      }
      // Update users state
      setUsers((prev) =>
        prev.map((u) => {
          if (u._id === userId) {
            const accountKey =
              item.fromAccount === "Crypto"
                ? "cryptoUSD"
                : item.fromAccount.toLowerCase();
            return {
              ...u,
              balances: {
                ...u.balances,
                [accountKey]:
                  (Number(u.balances?.[accountKey as keyof AdminUser["balances"]]) || 0) +
                  item.amountUSD,
              },
            };
          }
          return u;
        })
      );
      writeQueueLS((queue || []).map((q) => (q.id === item.id ? { ...q, status: "approved" } : q)));
      pushActivity(userId, {
        title: "Transfer approved",
        kind: item.rail === "crypto" ? "crypto" : "transfer",
        type: item.rail,
        amount: money(item.amountUSD),
        to: item.toLabel,
        ref: item.id,
      });
      localStorage.setItem(k(userId, "hb_open_txn"), "1");
      return;
    } catch {
      // Local fallback: synthesize a posted txn
      const txn: Txn = {
        id: uid("t"),
        date: new Date().toISOString(),
        merchant: labelFromRail(item.rail),
        category: item.rail === "crypto" ? "Crypto" : item.amountUSD > 0 ? "Income" : "Transfer",
        amount: item.amountUSD,
        account: item.fromAccount,
        direction: item.amountUSD < 0 ? "sent" : "received",
        crypto:
          item.rail === "crypto"
            ? {
                symbol: item.crypto?.symbol || "BTC",
                amount: item.crypto?.amount || 0,
                usdAtExecution: item.crypto?.usdAtExecution || btcPrice || 0,
                direction: item.crypto?.direction || "sent",
              }
            : undefined,
      };
      const nextTxns = [txn, ...txns];
      setTxns(nextTxns);
      writeTxnsLS(userId, nextTxns);

      if (item.fromAccount === "Checking") {
        adjustBalancesLS(userId, item.amountUSD, 0, 0);
        setChecking((v) => v + item.amountUSD);
      } else if (item.fromAccount === "Savings") {
        adjustBalancesLS(userId, 0, item.amountUSD, 0);
        setSavings((v) => v + item.amountUSD);
      } else if (item.fromAccount === "Crypto") {
        adjustBalancesLS(userId, 0, 0, item.amountUSD);
        setCryptoUSD((v) => v + item.amountUSD);
      }

      writeQueueLS((queue || []).map((q) => (q.id === item.id ? { ...q, status: "approved" } : q)));
      pushActivity(userId, {
        title: "Transfer approved",
        kind: item.rail === "crypto" ? "crypto" : "transfer",
        type: item.rail,
        amount: money(item.amountUSD),
        to: item.toLabel,
        ref: item.id,
      });
      localStorage.setItem(k(userId, "hb_open_txn"), "1");
    }
  }

  async function reject(item: QueueItem) {
    if (!userId) return;
    try {
      await request<{ ok: boolean; item: any }>(`/admin/queue/${item.id}`, {
        method: "PATCH",
        body: { status: "rejected" },
      });
    } catch {
      // ignore — still update UI
    }
    writeQueueLS((queue || []).map((q) => (q.id === item.id ? { ...q, status: "rejected" } : q)));
    pushActivity(userId, {
      title: "Transfer rejected",
      kind: "admin",
      type: item.rail,
      amount: money(item.amountUSD),
      to: item.toLabel,
      ref: item.id,
    });
  }

  async function pend(item: QueueItem) {
    if (!userId) return;
    try {
      await request<{ ok: boolean; item: any }>(`/admin/queue/${item.id}`, {
        method: "PATCH",
        body: { status: "on_hold" },
      });
    } catch {
      // ignore
    }
    writeQueueLS((queue || []).map((q) => (q.id === item.id ? { ...q, status: "on_hold" } : q)));
  }

  async function removeQueueItem(id: string) {
    if (!userId) return;
    try {
      await request<{ ok: boolean }>(`/admin/queue/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    writeQueueLS((queue || []).filter((x) => x.id !== id));
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return txns;
    const s = q.toLowerCase();
    return txns.filter(
      (t) =>
        t.merchant.toLowerCase().includes(s) ||
        (t.category || "").toLowerCase().includes(s) ||
        t.account.toLowerCase().includes(s)
    );
  }, [q, txns]);

  /* ----------------------------- Transactions tab -------------------------- */

  async function addTxn() {
    if (!userId) return;
    if (!draft.merchant || !draft.date || draft.amount === undefined) return;

    const dir: Direction = (draft.direction as Direction) || "sent";
    const amountSigned = ensureSigned(Number(draft.amount || 0), dir);

    try {
      const body: any = {
        date: new Date(String(draft.date)).toISOString(),
        merchant: String(draft.merchant),
        category: (draft.category as TxCategory) || "Transfer",
        amount: amountSigned, // signed by direction
        accountType: (draft.account as AccountType) || "Checking",
        description: "",
        referenceId: undefined,
        status: "posted",
        direction: dir,
        crypto:
          draft.category === "Crypto"
            ? {
                symbol: draft.crypto?.symbol || "BTC",
                amount: Number(draft.crypto?.amount || 0),
                usdAtExecution: Number(draft.crypto?.usdAtExecution || btcPrice || 0),
                direction: (draft.crypto?.direction as Direction) || "sent",
              }
            : undefined,
      };

      const r = await request<{ ok: boolean; txn: any }>(
        `/admin/users/${userId}/transactions`,
        { method: "POST", body }
      );

      const mapped = mapTxnFromAPI(r.txn);
      const next = [mapped, ...txns];
      setTxns(next);
      writeTxnsLS(userId, next);
    } catch {
      const t: Txn = {
        id: uid("t"),
        date: new Date(String(draft.date)).toISOString(),
        merchant: String(draft.merchant),
        category: (draft.category as TxCategory) || "Transfer",
        amount: amountSigned,
        account: (draft.account as AccountType) || "Checking",
        direction: dir,
        crypto:
          draft.category === "Crypto"
            ? {
                symbol: draft.crypto?.symbol || "BTC",
                amount: Number(draft.crypto?.amount || 0),
                usdAtExecution: Number(draft.crypto?.usdAtExecution || btcPrice || 0),
                direction: (draft.crypto?.direction as Direction) || "sent",
              }
            : undefined,
      };
      const next = [t, ...txns];
      setTxns(next);
      writeTxnsLS(userId, next);
    }

    setDraft({
      date: new Date().toISOString().slice(0, 10),
      account: "Checking",
      category: "Transfer",
      direction: "sent",
    });
  }

  function deleteTxn(id: string) {
    if (!userId) return;
    const next = txns.filter((t) => t.id !== id);
    setTxns(next);
    writeTxnsLS(userId, next);
  }

  function saveInsights() {
    if (!userId) return;
    localStorage.setItem(k(userId, "hb_insights_spent"), insSpent);
    localStorage.setItem(k(userId, "hb_insights_income"), insIncome);
    localStorage.setItem(k(userId, "hb_insights_topcat"), insTopCat);
    pushActivity(userId, { title: "Insights updated", kind: "admin", type: "insights" });
  }

  /* ----------------------------- Populate Tools ---------------------------- */

  const merchants = [
    "Amazon",
    "Uber",
    "Walmart",
    "Apple",
    "Spotify",
    "Netflix",
    "Target",
    "Airbnb",
    "DoorDash",
    "Shell",
  ];
  const spendCats: TxCategory[] = [
    "Bills",
    "Dining",
    "Groceries",
    "Transport",
    "Shopping",
    "Subscriptions",
    "Housing",
    "Refund",
    "Transfer",
  ];
  const accounts: AccountType[] = ["Checking", "Savings"];

  const rnd = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]) => arr[rnd(0, arr.length - 1)];

  let seeding = false;

  // Legacy quick seeder (n in last X days)
  async function injectFakeTxns(count: number, days = 45) {
    if (!userId || count <= 0 || seeding) return;
    seeding = true;
    try {
      const r = await request<{ ok: boolean; inserted: number }>(
        `/admin/users/${encodeURIComponent(userId)}/transactions/seed`,
        { method: "POST", body: { n: count, days } }
      );
      await fetchTxnsForUser(userId); // refresh table
      pushActivity(userId, {
        title: "Seeded transactions",
        kind: "admin",
        count: typeof r?.inserted === "number" ? r.inserted : count,
        type: "seed_txns",
      });
    } catch (e: any) {
      console.error("Server seeding failed, fallback skipped:", e?.message || e);
    } finally {
      seeding = false;
    }
  }

  // New: Range-based injector (sent/received with date bars)
  async function injectByRanges() {
    if (!userId) return;

    const body: any = { currency: injCurrency.toUpperCase() };
    if (injSentCount > 0 && injSentStart && injSentEnd) {
      body.sent = {
        count: injSentCount,
        start: new Date(injSentStart + "T00:00:00.000Z").toISOString(),
        end: new Date(injSentEnd + "T23:59:59.999Z").toISOString(),
        minAmount: injSentMin,
        maxAmount: injSentMax,
      };
    }
    if (injRecvCount > 0 && injRecvStart && injRecvEnd) {
      body.received = {
        count: injRecvCount,
        start: new Date(injRecvStart + "T00:00:00.000Z").toISOString(),
        end: new Date(injRecvEnd + "T23:59:59.999Z").toISOString(),
        minAmount: injRecvMin,
        maxAmount: injRecvMax,
      };
    }
    if (!body.sent && !body.received) return;

    try {
      await request<{ ok: boolean; inserted: number }>(
        `/admin/users/${encodeURIComponent(userId)}/transactions/fake`,
        { method: "POST", body }
      );
      await fetchTxnsForUser(userId);
      pushActivity(userId, {
        title: "Injected fake transactions (ranges)",
        kind: "admin",
        type: "seed_txns_ranges",
      });
    } catch (e: any) {
      console.error("Range injection failed:", e?.message || e);
    }
  }

  function injectFakeInsights() {
    if (!userId) return;
    const spent = `$${rnd(500, 3500).toLocaleString()}`;
    const income = `$${rnd(2000, 8000).toLocaleString()}`;
    const top = pick(["Dining", "Groceries", "Shopping", "Transport", "Bills", "Housing"]);

    setInsSpent(spent);
    setInsIncome(income);
    setInsTopCat(top);

    localStorage.setItem(k(userId, "hb_insights_spent"), spent);
    localStorage.setItem(k(userId, "hb_insights_income"), income);
    localStorage.setItem(k(userId, "hb_insights_topcat"), top);

    pushActivity(userId, {
      title: "Fake insights injected",
      kind: "admin",
      type: "seed_insights",
    });
  }

  /* ---------------------------- Crypto holdings UX ------------------------- */

  function addHoldingFromSymbol() {
    const sym = newAssetSymbol.trim();
    if (!sym) return;
    const key = sym.toLowerCase();
    setCryptoHoldings((prev) => {
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: { amount: 0 },
      };
    });
    setNewAssetSymbol("");
  }

  function removeHolding(assetId: string) {
    setCryptoHoldings((prev) => {
      const next = { ...prev };
      delete next[assetId];
      return next;
    });
  }

  /* ---------------------------------- UI ----------------------------------- */

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0E131B]/70 border-b border-white/10">
        <div className="container-x flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-300" />
            <div className="text-lg font-semibold">Horizon — Admin</div>
            <span className="text-xs text-white/60">Control Center</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Bell className="h-4 w-4" /> Live
          </div>
        </div>
      </header>

      <section className="container-x py-6">
        {/* User scope bar */}
        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <div className="text-sm text-white/70 mb-1">Select user</div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    className="w-full rounded-2xl bg-white/10 border border-white/20 pl-9 pr-8 py-2.5 appearance-none"
                    value={userIdSelect}
                    onChange={(e) => setUserIdSelect(e.target.value)}
                    disabled={loadingUsers || !!usersError}
                  >
                    {loadingUsers && <option value="">Loading users…</option>}
                    {usersError && <option value="">{`Error: ${usersError}`}</option>}
                    {!loadingUsers && !usersError && users.length === 0 && (
                      <option value="">No registered users found</option>
                    )}
                    {!loadingUsers &&
                      !usersError &&
                      users.map((u) => {
                        const label = u.fullName
                          ? `${u.fullName} ${u.email ? `• ${u.email}` : ""}`
                          : u.email || u._id;
                        return (
                          <option key={u._id} value={u._id}>
                            {label}
                          </option>
                        );
                      })}
                  </select>
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                </div>
                <button className={btnSecondary} onClick={applyUserSelection} disabled={!userIdSelect}>
                  {loadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{" "}
                  Load user
                </button>
                {userId && (
                  <button className={btnGhost} onClick={clearUser} title="Clear user">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {usersError && (
                <div className="text-xs text-rose-300 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {usersError}
                </div>
              )}

              {userId ? (
                <div className="text-xs text-white/60 mt-1">
                  Active user: <b className="text-white/80">{userId}</b>
                </div>
              ) : (
                <div className="text-xs text-rose-300 mt-1">No user selected.</div>
              )}
            </div>

            <div className="text-xs text-white/60">
              Users come from <code className="text-white/80">/admin/users</code>. Actions call the connected admin API
              and mirror to local storage as fallback.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabBtn active={tab === "queue"} onClick={() => setTab("queue")} icon={<Clock className="h-4 w-4" />}>
            Pending Queue
          </TabBtn>
          <TabBtn active={tab === "balances"} onClick={() => setTab("balances")} icon={<Wallet className="h-4 w-4" />}>
            Balances
          </TabBtn>
          <TabBtn
            active={tab === "transactions"}
            onClick={() => setTab("transactions")}
            icon={<CreditCard className="h-4 w-4" />}
          >
            Transactions
          </TabBtn>
          <TabBtn active={tab === "insights"} onClick={() => setTab("insights")} icon={<Filter className="h-4 w-4" />}>
            Insights
          </TabBtn>
          <TabBtn active={tab === "populate"} onClick={() => setTab("populate")} icon={<Database className="h-4 w-4" />}>
            Populate
          </TabBtn>
          <div className="ml-auto text-sm text-white/60 hidden md:block">
            Tip: Approvals reflect instantly on the user dashboard.
          </div>
        </div>

        {!userId ? (
          <div className="mt-6">
            <Empty>Choose a registered user to manage their account.</Empty>
          </div>
        ) : (
          <div className="mt-6 grid xl:grid-cols-[340px,1fr] gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {tab === "balances" && (
                <Panel title="Edit Balances" subtitle="Instantly updates user dashboard.">
                  <NumberInput label="Checking" value={checking} setValue={setChecking} prefix="$" />
                  <NumberInput label="Savings" value={savings} setValue={setSavings} prefix="$" />
                  <div className="h-px bg-white/10 my-3" />
                  <NumberInput label="Crypto total (USD)" value={cryptoUSD} setValue={setCryptoUSD} prefix="$" />
                  <NumberInput label="BTC reference price" value={btcPrice} setValue={setBtcPrice} prefix="$" />

                  {/* New: per-asset crypto holdings editor */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="text-sm font-semibold mb-1">Per-asset crypto holdings</div>
                    <div className="text-xs text-white/60 mb-3">
                      Set native amounts for BTC, ETH, etc. The user dashboard can turn these into live USD using{" "}
                      <code>useLiveCrypto</code>.
                    </div>

                    {Object.keys(cryptoHoldings).length === 0 ? (
                      <div className="text-xs text-white/50 mb-3">
                        No assets yet. Add <code>BTC</code>, <code>ETH</code>, etc.
                      </div>
                    ) : (
                      <div className="space-y-3 mb-3">
                        {Object.entries(cryptoHoldings).map(([assetId, row]) => (
                          <div
                            key={assetId}
                            className="grid grid-cols-[minmax(0,1fr),minmax(0,1fr),auto] gap-2 items-end"
                          >
                            <div>
                              <div className="text-[11px] uppercase tracking-wide text-white/60 mb-1">Asset</div>
                              <div className="px-3 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-sm">
                                {assetId.toUpperCase()}
                              </div>
                            </div>
                            <NumberInput
                              label="Amount"
                              value={Number(row.amount || 0)}
                              setValue={(v) =>
                                setCryptoHoldings((prev) => ({
                                  ...prev,
                                  [assetId]: { ...(prev[assetId] || {}), amount: v },
                                }))
                              }
                            />
                            <button
                              className={btnGhost + " !px-3 !py-2 text-xs"}
                              onClick={() => removeHolding(assetId)}
                              title="Remove asset"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-[minmax(0,1fr),auto] gap-2 items-end">
                      <TextInput
                        label="Add asset"
                        value={newAssetSymbol}
                        setValue={setNewAssetSymbol}
                        placeholder="e.g. BTC, ETH, SOL"
                      />
                      <button className={btnSecondary + " !px-3 !py-2 text-xs"} onClick={addHoldingFromSymbol}>
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>

                    {cryptoHoldings["bitcoin"] && (
                      <div className="mt-2 text-xs text-white/60">
                        BTC amount: <b>{cryptoHoldings["bitcoin"].amount}</b> — mirrors to{" "}
                        <code>balances.cryptoBTC</code> on save.
                      </div>
                    )}
                  </div>

                  <button className={btnPrimary + " mt-4"} onClick={saveBalances}>
                    <Save className="h-4 w-4" /> Save balances
                  </button>
                  <div className="mt-3 text-sm text-white/60">Total (fiat): {money(total)}</div>
                </Panel>
              )}

              {tab === "queue" && (
                <Panel title="New Queue Item" subtitle="Create a test item to approve/reject.">
                  <div className="grid gap-3">
                    <Select
                      label="Rail"
                      value={(qdraft.rail as string) || "ach_domestic"}
                      setValue={(v) =>
                        setQdraft((prev) => ({
                          ...prev,
                          rail: v as QueueItem["rail"],
                        }))
                      }
                      options={[
                        ["ach_domestic", "USA Transfer (ACH/Wire)"],
                        ["wire_international", "Wire Transfer (SWIFT)"],
                        ["paypal", "PayPal"],
                        ["wise", "Wise"],
                        ["revolut", "Revolut"],
                        ["zelle", "Zelle"],
                        ["venmo", "Venmo"],
                        ["wechat", "WeChat Pay"],
                        ["alipay", "Alipay"],
                        ["cashapp", "Cash App"],
                        ["crypto", "Cryptocurrency"],
                      ]}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="From account"
                        value={(qdraft.fromAccount as string) || "Checking"}
                        setValue={(v) =>
                          setQdraft((prev) => ({
                            ...prev,
                            fromAccount: v as AccountType,
                          }))
                        }
                        options={[
                          ["Checking", "Checking"],
                          ["Savings", "Savings"],
                          ["Crypto", "Crypto"],
                        ]}
                      />
                      <Select
                        label="Direction"
                        value={qdraft.direction || "sent"}
                        setValue={(v) =>
                          setQdraft((prev) => ({
                            ...prev,
                            direction: v as Direction,
                          }))
                        }
                        options={[
                          ["sent", "Sent (money out)"],
                          ["received", "Received (money in)"],
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <TextInput
                        label="Execution date"
                        type="date"
                        value={qdraft.executedAt || new Date().toISOString().slice(0, 10)}
                        setValue={(v) => setQdraft((prev) => ({ ...prev, executedAt: v }))}
                      />
                      <NumberInput
                        label="Amount (USD)"
                        value={Number(qdraft.amountUSD || 0)}
                        setValue={(v) => setQdraft((prev) => ({ ...prev, amountUSD: v }))}
                        prefix="$"
                      />
                    </div>

                    <TextInput
                      label="To / label"
                      value={qdraft.toLabel || ""}
                      setValue={(v) => setQdraft((prev) => ({ ...prev, toLabel: v }))}
                    />
                    <TextInput
                      label="Note (optional)"
                      value={qdraft.note || ""}
                      setValue={(v) => setQdraft((prev) => ({ ...prev, note: v }))}
                    />

                    {qdraft.rail === "crypto" && (
                      <div className="rounded-2xl border border-white/10 p-3 bg-white/[0.04]">
                        <div className="text-sm text-white/70 mb-2">Crypto details</div>
                        <div className="grid grid-cols-2 gap-3">
                          <TextInput
                            label="Symbol"
                            value={qdraft.crypto?.symbol || "BTC"}
                            setValue={(v) =>
                              setQdraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, symbol: v } };
                              })
                            }
                          />
                          <Select
                            label="Direction"
                            value={qdraft.crypto?.direction || "sent"}
                            setValue={(v) =>
                              setQdraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, direction: v as Direction } };
                              })
                            }
                            options={[
                              ["sent", "Sent"],
                              ["received", "Received"],
                            ]}
                          />
                          <NumberInput
                            label="Amount (coin)"
                            value={Number(qdraft.crypto?.amount || 0)}
                            setValue={(v) =>
                              setQdraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, amount: v } };
                              })
                            }
                          />
                          <NumberInput
                            label="USD @ execution"
                            value={Number(qdraft.crypto?.usdAtExecution || btcPrice || 0)}
                            setValue={(v) =>
                              setQdraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, usdAtExecution: v } };
                              })
                            }
                            prefix="$"
                          />
                        </div>
                      </div>
                    )}

                    <button className={btnSecondary} onClick={addQueueItem}>
                      <Plus className="h-4 w-4" /> Add to queue
                    </button>
                  </div>
                </Panel>
              )}

              {tab === "transactions" && (
                <Panel title="Create Transaction" subtitle="Manual entry (for corrections, etc.)">
                  <div className="grid gap-3">
                    <TextInput
                      label="Merchant / Memo"
                      value={draft.merchant || ""}
                      setValue={(v) => setDraft((prev) => ({ ...prev, merchant: v }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <TextInput
                        label="Date"
                        type="date"
                        value={String(draft.date || "")}
                        setValue={(v) => setDraft((prev) => ({ ...prev, date: v }))}
                      />
                      <Select
                        label="Account"
                        value={(draft.account as string) || "Checking"}
                        setValue={(v) =>
                          setDraft((prev) => ({
                            ...prev,
                            account: v as AccountType,
                          }))
                        }
                        options={[
                          ["Checking", "Checking"],
                          ["Savings", "Savings"],
                          ["Crypto", "Crypto"],
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Category"
                        value={(draft.category as string) || "Transfer"}
                        setValue={(v) =>
                          setDraft((prev) => ({
                            ...prev,
                            category: v as TxCategory,
                          }))
                        }
                        options={[
                          ["Income", "Income"],
                          ["Transfer", "Transfer"],
                          ["Bills", "Bills"],
                          ["Dining", "Dining"],
                          ["Groceries", "Groceries"],
                          ["Transport", "Transport"],
                          ["Shopping", "Shopping"],
                          ["Refund", "Refund"],
                          ["Subscriptions", "Subscriptions"],
                          ["Housing", "Housing"],
                          ["Crypto", "Crypto"],
                        ]}
                      />
                      <Select
                        label="Direction"
                        value={(draft.direction as string) || "sent"}
                        setValue={(v) =>
                          setDraft((prev) => ({
                            ...prev,
                            direction: v as Direction,
                          }))
                        }
                        options={[
                          ["sent", "Sent (money out)"],
                          ["received", "Received (money in)"],
                        ]}
                      />
                    </div>

                    <NumberInput
                      label="Amount (USD)"
                      value={Number(draft.amount || 0)}
                      setValue={(v) => setDraft((prev) => ({ ...prev, amount: v }))}
                      prefix="$"
                    />

                    {draft.category === "Crypto" && (
                      <div className="rounded-2xl border border-white/10 p-3 bg-white/[0.04]">
                        <div className="text-sm text-white/70 mb-2">Crypto details</div>
                        <div className="grid grid-cols-2 gap-3">
                          <TextInput
                            label="Symbol"
                            value={draft.crypto?.symbol || "BTC"}
                            setValue={(v) =>
                              setDraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, symbol: v } };
                              })
                            }
                          />
                          <Select
                            label="Direction"
                            value={draft.crypto?.direction || (draft.direction as Direction) || "sent"}
                            setValue={(v) =>
                              setDraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, direction: v as Direction } };
                              })
                            }
                            options={[
                              ["sent", "Sent"],
                              ["received", "Received"],
                            ]}
                          />
                          <NumberInput
                            label="Amount (coin)"
                            value={Number(draft.crypto?.amount || 0)}
                            setValue={(v) =>
                              setDraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, amount: v } };
                              })
                            }
                          />
                          <NumberInput
                            label="USD @ execution"
                            value={Number(draft.crypto?.usdAtExecution || btcPrice || 0)}
                            setValue={(v) =>
                              setDraft((prev) => {
                                const base = materializeCrypto(
                                  prev.crypto as CryptoInfo | undefined,
                                  btcPrice
                                );
                                return { ...prev, crypto: { ...base, usdAtExecution: v } };
                              })
                            }
                            prefix="$"
                          />
                        </div>
                      </div>
                    )}

                    <button className={btnSecondary} onClick={addTxn}>
                      <Plus className="h-4 w-4" /> Add transaction
                    </button>
                  </div>
                </Panel>
              )}

              {tab === "insights" && (
                <Panel title="Edit Insights" subtitle="Controls the dashboard ‘Spending Snapshot’.">
                  <TextInput label="Spent (30d)" value={insSpent} setValue={setInsSpent} placeholder="$0" />
                  <TextInput label="Income (30d)" value={insIncome} setValue={setInsIncome} placeholder="$0" />
                  <TextInput label="Top Category" value={insTopCat} setValue={setInsTopCat} placeholder="—" />
                  <button className={btnPrimary + " mt-4"} onClick={saveInsights}>
                    <Save className="h-4 w-4" /> Save insights
                  </button>
                </Panel>
              )}

              {tab === "populate" && (
                <Panel title="Populate (Dev Tools)" subtitle="Seed data for the selected user">
                  <div className="grid gap-5">
                    {/* NEW: Range injector */}
                    <div className="rounded-2xl border border-white/10 p-4 bg-white/[0.04]">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarIcon className="h-4 w-4 text-white/70" />
                        <div className="text-sm font-semibold">Bulk Inject by Ranges</div>
                      </div>

                      <div className="grid gap-3">
                        <TextInput label="Currency" value={injCurrency} setValue={setInjCurrency} />

                        <div className="grid md:grid-cols-3 gap-3">
                          <NumberInput label="Sent — Count" value={injSentCount} setValue={setInjSentCount} />
                          <TextInput label="Sent — Start" type="date" value={injSentStart} setValue={setInjSentStart} />
                          <TextInput label="Sent — End" type="date" value={injSentEnd} setValue={setInjSentEnd} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <NumberInput label="Sent — Min $" value={injSentMin} setValue={setInjSentMin} prefix="$" />
                          <NumberInput label="Sent — Max $" value={injSentMax} setValue={setInjSentMax} prefix="$" />
                        </div>

                        <div className="h-px bg-white/10 my-1" />

                        <div className="grid md:grid-cols-3 gap-3">
                          <NumberInput label="Received — Count" value={injRecvCount} setValue={setInjRecvCount} />
                          <TextInput
                            label="Received — Start"
                            type="date"
                            value={injRecvStart}
                            setValue={setInjRecvStart}
                          />
                          <TextInput
                            label="Received — End"
                            type="date"
                            value={injRecvEnd}
                            setValue={setInjRecvEnd}
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <NumberInput
                            label="Received — Min $"
                            value={injRecvMin}
                            setValue={setInjRecvMin}
                            prefix="$"
                          />
                          <NumberInput
                            label="Received — Max $"
                            value={injRecvMax}
                            setValue={setInjRecvMax}
                            prefix="$"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button className={btnPrimary} onClick={injectByRanges}>
                            <SendHorizonal className="h-4 w-4" /> Inject by ranges
                          </button>
                          <div className="text-xs text-white/60 self-center">
                            Tags each record with <code>meta.isSynthetic</code> &amp; batch id.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Legacy quick seeder (keep for convenience) */}
                    <div className="rounded-2xl border border-white/10 p-4 bg-white/[0.04]">
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="h-4 w-4 text-white/70" />
                        <div className="text-sm font-semibold">Quick Seed (last X days)</div>
                      </div>
                      <div className="grid gap-3">
                        <NumberInput label="How many fake transactions?" value={seedCount} setValue={setSeedCount} />
                        <div className="flex gap-2">
                          <button className={btnSecondary} onClick={() => injectFakeTxns(seedCount)}>
                            <Plus className="h-4 w-4" /> Inject Fake Txns
                          </button>
                          <button className={btnPrimary} onClick={injectFakeInsights}>
                            <Database className="h-4 w-4" /> Inject Fake Insights
                          </button>
                        </div>
                        <div className="text-xs text-white/60">
                          Transactions update balances locally; use “Balances” to persist to server.
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}

              <Panel title="Shortcuts">
                <div className="grid grid-cols-2 gap-3">
                  <button className={btnGhost} onClick={() => router.push("/dashboard")}>
                    <ArrowLeft className="h-4 w-4" /> Back to dashboard
                  </button>
                  <button className={btnGhost} onClick={() => location.reload()}>
                    <RefreshCcw className="h-4 w-4" /> Refresh
                  </button>
                </div>
              </Panel>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {tab === "queue" && (
                <Panel title="Pending Queue" subtitle="Approve to post immediately to the account & feed.">
                  {queue.length === 0 ? (
                    <Empty>Nothing in the queue.</Empty>
                  ) : (
                    <div className="space-y-3">
                      {queue.map((item) => (
                        <QueueRow
                          key={item.id}
                          item={item}
                          onApprove={() => approve(item)}
                          onReject={() => reject(item)}
                          onPend={() => pend(item)}
                          onRemove={() => removeQueueItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </Panel>
              )}

              {tab === "balances" && (
                <Panel title="At a glance">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Kpi icon={<Wallet />} label="Checking" value={money(checking)} />
                    <Kpi icon={<PiggyBank />} label="Savings" value={money(savings)} />
                    <Kpi icon={<Bitcoin />} label="Crypto (USD)" value={money(cryptoUSD)} />
                  </div>
                </Panel>
              )}

              {tab === "transactions" && (
                <Panel title="Transactions" subtitle="Newest first.">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <input
                        className="w-full rounded-2xl bg-white/10 border border-white/20 pl-9 pr-3 py-2.5"
                        placeholder="Search merchant, category, or account…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                    </div>
                    <div className="text-sm text-white/60 hidden md:block">
                      {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <Empty>No transactions.</Empty>
                  ) : (
                    <div className="rounded-2xl overflow-hidden border border-white/15 divide-y divide-white/10">
                      {filtered.map((t) => (
                        <TxnRow key={t.id} t={t} onDelete={() => deleteTxn(t.id)} />
                      ))}
                    </div>
                  )}
                </Panel>
              )}

              {tab === "insights" && (
                <Panel title="Preview">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Kpi icon={<CreditCard />} label="Spent (30d)" value={insSpent || "—"} />
                    <Kpi icon={<Wallet />} label="Income (30d)" value={insIncome || "—"} />
                    <Kpi icon={<Filter />} label="Top category" value={insTopCat || "—"} />
                  </div>
                </Panel>
              )}

              {tab === "populate" && (
                <Panel title="What got injected?">
                  <div className="text-sm text-white/70">
                    Use the Transactions/Insights tabs to verify the seeded data for <b>{userId}</b>.
                  </div>
                </Panel>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* -----------------------------------------------------------------------------
  Components
----------------------------------------------------------------------------- */

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-white/60 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm border transition-all ${
        active
          ? "bg-[#00E0FF]/15 border-[#00E0FF]/40"
          : "bg-white/10 border-white/20 hover:bg-white/[0.12]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function NumberInput({
  label,
  value,
  setValue,
  prefix,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  prefix?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">{prefix}</span>
        )}
        <input
          inputMode="decimal"
          value={String(value)}
          onChange={(e) => setValue(Number(e.target.value || 0))}
          className={`w-full rounded-2xl bg-white/10 border border-white/20 ${
            prefix ? "pl-7" : "pl-3"
          } pr-3 py-2.5`}
        />
      </div>
    </label>
  );
}

function TextInput({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-white/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-2.5"
      />
    </label>
  );
}

function Select({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-2.5 appearance-none"
        >
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
      </div>
    </label>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 grid place-items-center">
          {icon}
        </div>
        <div className="text-sm">{label}</div>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-10 text-center text-white/70">
      {children}
    </div>
  );
}

function QueueRow({
  item,
  onApprove,
  onReject,
  onPend,
  onRemove,
}: {
  item: QueueItem;
  onApprove: () => void;
  onReject: () => void;
  onPend: () => void;
  onRemove: () => void;
}) {
  const tone =
    item.status === "pending"
      ? "text-amber-300"
      : item.status === "approved"
      ? "text-emerald-300"
      : item.status === "on_hold"
      ? "text-blue-300"
      : "text-rose-300";

  const label = labelFromRail(item.rail);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${tone} uppercase tracking-wide`}>{item.status}</span>
          <span className="text-xs text-white/50">•</span>
          <span className="text-xs text-white/60">{new Date(item.createdAt).toLocaleString()}</span>
        </div>
        <div className="text-base font-semibold mt-1">
          {label} — {item.toLabel}
        </div>
        <div className="text-sm text-white/70">
          From <b>{item.fromAccount}</b> • {money(Math.abs(item.amountUSD))}{" "}
          {item.amountUSD < 0 ? "debit" : "credit"}
          {item.note ? ` • ${item.note}` : ""}
          {item.rail === "crypto" && item.crypto && (
            <span>
              {" "}
              • <Bitcoin className="inline h-4 w-4 -mt-0.5" /> {item.crypto.amount} {item.crypto.symbol} (
              {item.crypto.direction}) @ {money(item.crypto.usdAtExecution)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className={btnGhost} onClick={onPend}>
          <Clock className="h-4 w-4" /> Pend
        </button>
        <button className={btnDanger} onClick={onReject}>
          <X className="h-4 w-4" /> Reject
        </button>
        <button className={btnPrimary} onClick={onApprove}>
          <Check className="h-4 w-4" /> Approve
        </button>
        <button className={btnGhost} onClick={onRemove} title="Remove from queue">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TxnRow({ t, onDelete }: { t: Txn; onDelete?: () => void }) {
  const isIncome = t.amount > 0;
  const isCrypto = !!t.crypto;
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02]">
      <div className="flex items-center gap-4">
        <div
          className={`h-9 w-9 rounded-xl grid place-items-center border ${
            isIncome
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/15 text-rose-300"
          }`}
        >
          {isIncome ? "+" : "−"}
        </div>
        <div>
          <div className="text-sm font-semibold">{t.merchant}</div>
          <div className="text-xs text-white/60">
            {new Date(t.date).toLocaleDateString()} • {t.category} • {t.account}
          </div>
          {isCrypto && t.crypto && (
            <div className="text-xs text-white/60 mt-0.5">
              <Bitcoin className="inline h-3 w-3 -mt-0.5" /> {t.crypto.amount} {t.crypto.symbol} • ≈{" "}
              {money(t.crypto.amount * t.crypto.usdAtExecution)} ({t.crypto.direction})
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`text-sm font-bold tabular-nums ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
          {money(t.amount)}
        </div>
        <button className={btnGhost} onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
  Styling helpers
----------------------------------------------------------------------------- */

const btnBase =
  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition shadow-md";
const palette = {
  primary:
    "bg-[#00E0FF]/15 border border-[#00E0FF]/40 hover:bg-[#00E0FF]/20 text-white",
  secondary:
    "bg-white/15 border border-white/25 hover:bg-white/20 text-white",
  danger:
    "bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-200",
  ghost: "bg-white/5 border border-white/15 hover:bg-white/10 text-white/90",
};

function classNames(...xs: string[]) {
  return xs.filter(Boolean).join(" ");
}

function labelFromRail(rail: QueueItem["rail"]) {
  switch (rail) {
    case "wire_international":
      return "Wire Transfer (SWIFT)";
    case "ach_domestic":
      return "USA Transfer (ACH/Wire)";
    case "paypal":
      return "PayPal";
    case "wise":
      return "Wise";
    case "revolut":
      return "Revolut";
    case "zelle":
      return "Zelle";
    case "venmo":
      return "Venmo";
    case "wechat":
      return "WeChat Pay";
    case "alipay":
      return "Alipay";
    case "cashapp":
      return "Cash App";
    case "crypto":
      return "Cryptocurrency";
    default:
      return "Transfer";
  }
}

const btnPrimary = classNames(btnBase, palette.primary);
const btnSecondary = classNames(btnBase, palette.secondary);
const btnDanger = classNames(btnBase, palette.danger);
const btnGhost = classNames(btnBase, palette.ghost);
