// src/lib/sim-ledger.ts
// Lightweight client-only ledger used to test flows before backend

/* ---------------------------------- Types --------------------------------- */

export type AccountName = "Checking" | "Savings";

export type Rail =
  | "ach"
  | "wire_domestic"
  | "wire_international"
  | "crypto";

export type SimTransfer = {
  // core
  amount: number;                  // positive number in source currency
  currency?: string;               // default "USD"
  rail: Rail;
  recipientName: string;
  recipientAccountMasked?: string; // "••••1234"
  note?: string;

  // optional FX/crypto
  convertedValue?: number;   // target currency value
  convertedCurrency?: string;
  fxRate?: number;           // e.g. 0.92
  networkFee?: number;       // for crypto etc.
  network?: string;          // for crypto, e.g. "Bitcoin"

  // bookkeeping
  fromAccount?: AccountName; // default "Checking"
};

export type TxnRow = {
  id: string;
  date: string;             // YYYY-MM-DD
  merchant: string;
  category: string;         // "Transfer"
  amount: number;           // negative for spend
  account: AccountName;
};

export type TransferSummary = {
  status: "pending" | "completed" | "failed";
  type: Rail;
  createdAt: string;        // ISO
  executedAt?: string;      // ISO
  etaText?: string;
  amount: { value: number; currency: string };
  converted?: { value: number; currency: string; rate?: number; lockedAt?: string };
  fees: { app: number; network: number; currency: string };
  sender: { accountName: AccountName; accountMasked: string };
  recipient: {
    name: string;
    accountMasked?: string;
    cryptoAddress?: string;
    network?: "Bitcoin" | "Ethereum" | "Solana" | string;
  };
  railInfo?: unknown;
  referenceId: string;
  note?: string;
};

/* --------------------------------- Storage -------------------------------- */

const TXN_KEY = "hb_txns";
const CHECKING_KEY = "hb_acc_checking_bal";
const SAVINGS_KEY = "hb_acc_savings_bal";
const LAST_TRANSFER_KEY = "last_transfer";
const OPEN_TXN_FLAG = "hb_open_txn";

const hasWindow = () => typeof window !== "undefined";

/* ------------------------------- Txn helpers ------------------------------ */

export function ensureSeedTxns(sample: TxnRow[]) {
  if (!hasWindow()) return;
  if (!localStorage.getItem(TXN_KEY)) {
    localStorage.setItem(TXN_KEY, JSON.stringify(sample));
  }
}

export function readTxns(): TxnRow[] {
  if (!hasWindow()) return [];
  try {
    const raw = localStorage.getItem(TXN_KEY);
    if (!raw) return [];
    const txns = JSON.parse(raw) as TxnRow[];
    // Sort by date desc, then id desc to ensure consistent order
    txns.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return txns;
  } catch {
    return [];
  }
}

export function writeTxns(txns: TxnRow[]) {
  if (!hasWindow()) return;
  localStorage.setItem(TXN_KEY, JSON.stringify(txns));
}

/* ------------------------------ Balance helpers --------------------------- */

export function readBalances() {
  const read = (k: string, fallback: number) => {
    if (!hasWindow()) return fallback;
    const v = Number(localStorage.getItem(k));
    return Number.isFinite(v) ? v : fallback;
  };
  return {
    checking: read(CHECKING_KEY, 5023.75),
    savings: read(SAVINGS_KEY, 8350.2),
  };
}

export function writeBalances(bal: { checking: number; savings: number }) {
  if (!hasWindow()) return;
  localStorage.setItem(CHECKING_KEY, String(bal.checking));
  localStorage.setItem(SAVINGS_KEY, String(bal.savings));
}

/* --------------------------------- Builders ------------------------------- */

function todayISODate(): string {
  const d = new Date();
  // local date slice so your grouping works like the UI expects
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeTxnRow(sim: SimTransfer): TxnRow {
  const now = Date.now();
  const id = `t${now}${Math.random().toString(36).slice(2, 6)}`;
  const category = "Transfer";
  const networkFee = sim.networkFee || 0;
  return {
    id,
    date: todayISODate(),
    merchant: sim.recipientName,
    category,
    amount: -(sim.amount + networkFee),
    account: sim.fromAccount || "Checking",
  };
}

/* ------------------------------ Public actions ---------------------------- */

export function simulateTransfer(sim: SimTransfer): TransferSummary {
  if (sim.amount <= 0) {
    throw new Error("Amount must be positive");
  }
  const ccy = sim.currency || "USD";
  if (ccy !== "USD") {
    throw new Error("Only USD supported");
  }
  const from: AccountName = sim.fromAccount || "Checking";

  const networkFee = sim.networkFee || 0;
  const totalDebit = sim.amount + networkFee;

  // 1) Check balances
  const bal = readBalances();
  const currentBal = from === "Checking" ? bal.checking : bal.savings;
  const nowISO = new Date().toISOString();
  const ref = "TX_" + Math.random().toString(36).slice(2, 8).toUpperCase();

  if (currentBal < totalDebit) {
    const summary: TransferSummary = {
      status: "failed",
      type: sim.rail,
      createdAt: nowISO,
      etaText: "Insufficient funds",
      amount: { value: sim.amount, currency: ccy },
      converted:
        sim.convertedValue && sim.convertedCurrency
          ? {
              value: sim.convertedValue,
              currency: sim.convertedCurrency,
              rate: sim.fxRate,
              lockedAt: nowISO,
            }
          : undefined,
      fees: { app: 0, network: networkFee, currency: ccy },
      sender: {
        accountName: from,
        accountMasked: from === "Checking" ? "••••9876" : "••••4432",
      },
      recipient: {
        name: sim.recipientName,
        ...(sim.rail === "crypto"
          ? { cryptoAddress: sim.recipientAccountMasked, network: sim.network || "Bitcoin" }
          : { accountMasked: sim.recipientAccountMasked }),
      },
      railInfo: undefined,
      referenceId: ref,
      note: sim.note,
    };

    if (hasWindow()) {
      localStorage.setItem(LAST_TRANSFER_KEY, JSON.stringify(summary));
      localStorage.setItem(OPEN_TXN_FLAG, "1"); // still open for failed
    }

    return summary;
  }

  // Proceed with success
  if (from === "Checking") bal.checking -= totalDebit;
  else bal.savings -= totalDebit;
  writeBalances(bal);

  // 2) Push txn to feed (prepend)
  const txns = readTxns();
  txns.unshift(makeTxnRow(sim));
  // Sort to ensure order
  txns.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  writeTxns(txns);

  // 3) Create success summary
  const summary: TransferSummary = {
    status: "completed",
    type: sim.rail,
    createdAt: nowISO,
    executedAt: nowISO,
    etaText: "Delivered",
    amount: { value: sim.amount, currency: ccy },
    converted:
      sim.convertedValue && sim.convertedCurrency
        ? {
            value: sim.convertedValue,
            currency: sim.convertedCurrency,
            rate: sim.fxRate,
            lockedAt: nowISO,
          }
        : undefined,
    fees: { app: 0, network: networkFee, currency: ccy },
    sender: {
      accountName: from,
      accountMasked: from === "Checking" ? "••••9876" : "••••4432",
    },
    recipient: {
      name: sim.recipientName,
      ...(sim.rail === "crypto"
        ? { cryptoAddress: sim.recipientAccountMasked, network: sim.network || "Bitcoin" }
        : { accountMasked: sim.recipientAccountMasked }),
    },
    railInfo: undefined,
    referenceId: ref,
    note: sim.note,
  };

  if (hasWindow()) {
    localStorage.setItem(LAST_TRANSFER_KEY, JSON.stringify(summary));
    localStorage.setItem(OPEN_TXN_FLAG, "1"); // tell dashboard to open transactions
  }

  return summary;
}

/* ------------------------------- Small helpers ---------------------------- */

export function readLastTransfer(): TransferSummary | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(LAST_TRANSFER_KEY);
    return raw ? (JSON.parse(raw) as TransferSummary) : null;
  } catch {
    return null;
  }
}

export function clearLastTransfer() {
  if (!hasWindow()) return;
  localStorage.removeItem(LAST_TRANSFER_KEY);
}

export function shouldOpenTxnOnNextVisit(): boolean {
  if (!hasWindow()) return false;
  return localStorage.getItem(OPEN_TXN_FLAG) === "1";
}

export function clearOpenTxnFlag() {
  if (!hasWindow()) return;
  localStorage.removeItem(OPEN_TXN_FLAG);
}