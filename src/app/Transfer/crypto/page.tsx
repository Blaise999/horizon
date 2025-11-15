// app/dashboard/crypto/page.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Bitcoin,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ArrowRightLeft,
  Info,
  ShieldCheck,
  X,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createCryptoBuy,
  createCryptoSwap,
  createCryptoSend,
  meUser,
  myAccounts, // ✅ authoritative Checking/Savings (accounts API)
  verifyTransferOtp, // ✅ confirm OTP
} from "@/libs/api";

/* -----------------------------------------------------------------------------
  $ → Crypto • Deposit / Buy (BTC-only) / Swap / Send (pending review + OTP)

  ✅ Checking/Savings pulled from myAccounts(); if missing, fall back to /users/me.balances
  ✅ Price seeding from server:
     - balances.btcPrice (cents → dollars)
     - balances.cryptoUSD (cents → dollars) → derive BTC units = cryptoUSD / btcPrice
  ✅ Optimistic updates (local pending deltas)
----------------------------------------------------------------------------- */

type Quote = {
  id: string; // CoinGecko id
  symbol: string; // "BTC"
  name: string; // "Bitcoin"
  logo: string; // "/coins/btc.svg"
  decimals?: number;
};

const COINS: Quote[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", logo: "/coins/btc.svg", decimals: 8 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", logo: "/coins/eth.svg", decimals: 6 },
  { id: "tether", symbol: "USDT", name: "Tether", logo: "/coins/usdt.svg", decimals: 6 },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin", logo: "/coins/usdc.svg", decimals: 6 },
  { id: "solana", symbol: "SOL", name: "Solana", logo: "/coins/sol.svg", decimals: 6 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", logo: "/coins/bnb.svg", decimals: 6 },
  { id: "ripple", symbol: "XRP", name: "XRP", logo: "/coins/xrp.svg", decimals: 6 },
  { id: "cardano", symbol: "ADA", name: "Cardano", logo: "/coins/ada.svg", decimals: 6 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", logo: "/coins/doge.svg", decimals: 6 },
  { id: "tron", symbol: "TRX", name: "TRON", logo: "/coins/trx.svg", decimals: 6 },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", logo: "/coins/dot.svg", decimals: 6 },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", logo: "/coins/ltc.svg", decimals: 6 },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", logo: "/coins/avax.svg", decimals: 6 },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", logo: "/coins/link.svg", decimals: 6 },
  { id: "stellar", symbol: "XLM", name: "Stellar", logo: "/coins/xlm.svg", decimals: 6 },
];

const COIN_BY_SYMBOL = COINS.reduce<Record<string, Quote>>((m, c) => {
  m[c.symbol] = c;
  return m;
}, {});

type AccountType = "Checking" | "Savings";
type Holdings = Record<string /*symbol*/, number /*units*/>;

type PendingDelta = {
  ref: string;
  ts: number;
  desc: string;
  deltas: Record<string, number>; // symbol -> ±units
};

/* ------------------------------- Helpers ------------------------------- */

// cents → dollars (quick convert for server snapshots on /users/me.balances)
function dollarsFromMinor(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) / 100 : 0;
}

export default function CryptoFlowsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");

  // Account balances – authoritative from API (MAJOR units)
  const [checkingBalance, setCheckingBalance] = useState<number>(0);
  const [savingsBalance, setSavingsBalance] = useState<number>(0);
  const [payFrom, setPayFrom] = useState<AccountType>("Checking");

  // USD input (Buy BTC)
  const [usd, setUsd] = useState<string>("1000");

  // Quotes / polling
  const [prices, setPrices] = useState<Record<string, { usd: number }>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [intervalSec, setIntervalSec] = useState(10);
  const timerRef = useRef<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Tabs
  const [tab, setTab] = useState<"deposit" | "buy" | "swap" | "send">("deposit");

  // Deposit (show BTC address from onboarding via API)
  const [btcAddress, setBtcAddress] = useState<string>("");
  const [btcAddrLoading, setBtcAddrLoading] = useState<boolean>(false);

  // Holdings + pending optimistic deltas
  const [holdings, setHoldings] = useState<Holdings>({});
  const [pending, setPending] = useState<Record<string, PendingDelta>>({});

  // Swap: from/to coin + amount in source units
  const [swapFromId, setSwapFromId] = useState<string>("bitcoin"); // start at BTC
  const [swapToId, setSwapToId] = useState<string>("ethereum");
  const [swapFromUnits, setSwapFromUnits] = useState<string>("0.10");
  const [slippagePct, setSlippagePct] = useState<number>(0.5); // %
  const [reversed, setReversed] = useState(false);

  // Send: address
  const [sendAddress, setSendAddress] = useState<string>("");

  // OTP drawer state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpRef, setOtpRef] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  /* ------------------------------- Derived ------------------------------- */
  const BTC = COINS.find((c) => c.id === "bitcoin")!;
  const btcPrice = prices?.[BTC.id]?.usd ?? 0;

  const usdValue = useMemo(() => {
    const raw = String(usd).replace(/[,$\s]/g, "");
    const n = Number(raw);
    return isFinite(n) && n >= 0 ? n : 0;
  }, [usd]);

  const buyUnits = useMemo(() => (btcPrice > 0 ? usdValue / btcPrice : 0), [usdValue, btcPrice]);

  // Swap derived
  const fromCoin = COINS.find((c) => c.id === swapFromId)!;
  const toCoin = COINS.find((c) => c.id === swapToId)!;
  const fromPrice = prices?.[swapFromId]?.usd ?? 0;
  const toPrice = prices?.[swapToId]?.usd ?? 0;

  const fromUnitsNum = useMemo(() => {
    const n = Number(String(swapFromUnits).replace(/[,\s]/g, ""));
    return isFinite(n) && n >= 0 ? n : 0;
  }, [swapFromUnits]);

  // Cross via USD
  const quoteOut = useMemo(() => {
    if (!(fromPrice > 0) || !(toPrice > 0) || !(fromUnitsNum > 0)) return 0;
    return fromUnitsNum * (fromPrice / toPrice);
  }, [fromUnitsNum, fromPrice, toPrice]);

  const minReceived = useMemo(() => quoteOut * (1 - slippagePct / 100), [quoteOut, slippagePct]);

  // Must involve BTC
  const swapInvolvesBTC = useMemo(
    () => fromCoin.symbol === "BTC" || toCoin.symbol === "BTC",
    [fromCoin.symbol, toCoin.symbol]
  );

  /* ------------------------------- Effects ------------------------------- */

  // Load user, holdings, pending deltas, balances, deposit address
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial local fallback name (same pattern as Venmo page)
    setUserName(localStorage.getItem("hb_user_name") || "User");

    // Holdings (persisted locally)
    try {
      const raw = localStorage.getItem("hb_crypto_holdings");
      setHoldings(raw ? JSON.parse(raw) : {});
    } catch {
      setHoldings({});
    }

    // Pending (persisted locally)
    try {
      const raw = localStorage.getItem("hb_crypto_pending");
      setPending(raw ? JSON.parse(raw) : {});
    } catch {
      setPending({});
    }

    // Accurate account balances (from accounts API)
    (async () => {
      try {
        const acct = await myAccounts();
        const { checking, savings } = extractFiatBalances(acct);
        setCheckingBalance(checking);
        setSavingsBalance(savings);
      } catch {
        // We'll fallback to /users/me.balances below if this fails
      }
    })();

    // BTC deposit address + server balance snapshot seed + name from /users/me
    (async () => {
      setBtcAddrLoading(true);
      try {
        const userResp = await meUser();
        const u: any = (userResp as any)?.user ?? userResp;

        // 🔹 Name from /users/me (mirrors Venmo pattern)
        const full =
          [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
          u?.fullName ||
          u?.handle ||
          "User";
        setUserName(full);
        try {
          localStorage.setItem("hb_user_name", full);
        } catch {}

        // 🔹 BTC address from /users/me
        const address = extractBtcAddress(u);
        if (address) {
          setBtcAddress(address);
          try {
            localStorage.setItem("hb_btc_wallet", address);
          } catch {}
        } else {
          const lsAddr = localStorage.getItem("hb_btc_wallet") || "";
          setBtcAddress(lsAddr);
        }

        // 🔹 Server balances snapshot (these look like cents → dollars)
        const b = u?.balances || {};

        const serverCheckingUSD = dollarsFromMinor(b?.checking);
        const serverSavingsUSD = dollarsFromMinor(b?.savings);
        if (serverCheckingUSD > 0 || serverSavingsUSD > 0) {
          // Use these only if accounts API didn't already set values
          setCheckingBalance((prev) => (prev > 0 ? prev : serverCheckingUSD));
          setSavingsBalance((prev) => (prev > 0 ? prev : serverSavingsUSD));
        }

        const serverBtcPriceUSD = dollarsFromMinor(b?.btcPrice); // e.g. 1010000 → 10100.00
        const serverCryptoUSD = dollarsFromMinor(b?.cryptoUSD); // e.g. 100000  → 1000.00

        // If backend provides a price, seed BTC price now (Coingecko will refresh later)
        if (serverBtcPriceUSD > 0) {
          setPrices((prev) => ({ ...prev, bitcoin: { usd: serverBtcPriceUSD } }));
        }

        // Derive BTC units = total crypto USD / btcPrice (snapshot)
        if (serverCryptoUSD > 0 && serverBtcPriceUSD > 0) {
          const units = +(serverCryptoUSD / serverBtcPriceUSD).toFixed(8);
          setHoldings((prev) => {
            const next = { ...prev, BTC: units };
            try {
              localStorage.setItem("hb_crypto_holdings", JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      } catch {
        const lsAddr = localStorage.getItem("hb_btc_wallet") || "";
        setBtcAddress(lsAddr);
      } finally {
        setBtcAddrLoading(false);
      }
    })();
  }, []);

  // Price API (CoinGecko)
  const API_URL = useMemo(() => {
    const ids = COINS.map((c) => c.id).join(",");
    return `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  }, []);

  async function fetchQuotes() {
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, { usd: number }>;
      setPrices(data);
      setLastUpdated(new Date());
    } catch {
      setErr("Couldn't refresh prices. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuotes();
  }, [API_URL]);

  useEffect(() => {
    const interval = Math.max(5, Math.min(300, Number(intervalSec) || 10));
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(fetchQuotes, interval * 1000) as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [intervalSec, API_URL]);

  /* ------------------------------- UI helpers ------------------------------- */

  // Extract Checking/Savings with shape fallbacks, treating values as MAJOR units
  function extractFiatBalances(acct: any): { checking: number; savings: number } {
    // possible shapes:
    // 1) { accounts: [{type:'checking'|'savings', balance | balance_minor}, ...] }
    // 2) [{ accountType:'checking', available | available_minor }, ...]
    // 3) { checking: {balance | balance_minor}, savings: {balance | balance_minor} }

    const list: any[] =
      (acct?.accounts && Array.isArray(acct.accounts) && acct.accounts) ||
      (Array.isArray(acct) ? acct : []) ||
      [];

    const keyed = !Array.isArray(acct) && typeof acct === "object" ? acct : {};

    const fromList = (t: string) =>
      list.find((a) => String(a?.type || a?.accountType || "").toLowerCase() === t);

    const c = fromList("checking");
    const s = fromList("savings");

    const kc = keyed?.checking;
    const ks = keyed?.savings;

    // Read a "major-ish" USD value from any of the usual fields
    const readMajor = (a: any): number | undefined => {
      if (!a) return undefined;

      const raw =
        a.balance_minor ??
        a.available_minor ??
        a.minor ??
        a.balance ??
        a.available ??
        a.current ??
        a.ledger;

      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };

    const checking = readMajor(c) ?? readMajor(kc) ?? 0;
    const savings = readMajor(s) ?? readMajor(ks) ?? 0;

    return { checking, savings };
  }

  // Extract BTC address from /users/me
  function extractBtcAddress(user: any): string | null {
    if (!user) return null;

    const w = user.wallets || user.wallet || null;
    const addrFromWalletString =
      (typeof w?.btc === "string" && w.btc.length > 8 && w.btc) ||
      (typeof w?.BTC === "string" && (w.BTC as string).length > 8 && w.BTC) ||
      null;

    const fromKeyField =
      (typeof w?.btcAddress === "string" && w.btcAddress.length > 8 && w.btcAddress) ||
      (typeof w?.bitcoinAddress === "string" && w.bitcoinAddress.length > 8 && w.bitcoinAddress) ||
      null;

    const fromObjShape =
      (w?.BTC && typeof w.BTC.address === "string" && w.BTC.address.length > 8 && w.BTC.address) ||
      (w?.btc && typeof w.btc.address === "string" && w.btc.address.length > 8 && w.btc.address) ||
      null;

    const flat =
      (typeof user.btc === "string" && user.btc.length > 8 && user.btc) ||
      (typeof user.btcAddress === "string" && user.btcAddress.length > 8 && user.btcAddress) ||
      (typeof user.bitcoinAddress === "string" &&
        user.bitcoinAddress.length > 8 &&
        user.bitcoinAddress) ||
      null;

    return addrFromWalletString || fromKeyField || fromObjShape || flat || null;
  }

  function showToast(kind: "ok" | "err", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2200);
  }

  function formatFiat(n: number) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function fmtUnits(n: number, d = 6) {
    if (!isFinite(n) || n === 0) return "0";
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: d });
  }

  function persistHoldings(next: Holdings) {
    setHoldings(next);
    try {
      localStorage.setItem("hb_crypto_holdings", JSON.stringify(next));
    } catch {}
  }

  function persistPending(next: Record<string, PendingDelta>) {
    setPending(next);
    try {
      localStorage.setItem("hb_crypto_pending", JSON.stringify(next));
    } catch {}
  }

  /** Apply a set of deltas to holdings (e.g., {BTC:-0.2, ETH:+3.1}) */
  function applyHoldingsDelta(deltas: Record<string, number>) {
    persistHoldings(
      Object.keys(deltas).reduce<Holdings>((acc, sym) => {
        const prev = acc[sym] ?? 0;
        const next = +(prev + (deltas[sym] || 0)).toFixed(12);
        if (next <= 0) {
          const copy = { ...acc };
          delete copy[sym];
          return copy;
        }
        return { ...acc, [sym]: next };
      }, { ...holdings })
    );
  }

  /** Record an optimistic delta against a reference (for "Pending" badge) */
  function recordPendingDelta(ref: string, deltas: Record<string, number>, desc: string) {
    const entry: PendingDelta = { ref, ts: Date.now(), deltas, desc };
    const next = { ...pending, [ref]: entry };
    persistPending(next);
    applyHoldingsDelta(deltas); // optimistic update now
  }

  function pendingDeltaFor(sym: string): number {
    return Object.values(pending).reduce((sum, p) => sum + (p.deltas[sym] || 0), 0);
  }

  function openOtp(refId: string) {
    setOtpRef(refId);
    setOtpCode("");
    setOtpError(null);
    setOtpOpen(true);
  }
  function closeOtp() {
    setOtpOpen(false);
    setOtpRef(null);
    setOtpCode("");
    setOtpError(null);
  }

  /* -------------------------------- Actions ------------------------------- */

  // BUY: USD -> BTC (optimistic +BTC)
  async function handleBuyBtc() {
    if (!(btcPrice > 0) || !(usdValue > 0)) {
      showToast("err", "Enter a valid amount and ensure price is available.");
      return;
    }
    try {
      setLoading(true);
      const units = +(usdValue / btcPrice);
      const res = await createCryptoBuy({
        fromAccount: payFrom, // "Checking" | "Savings"
        usdAmount: +usdValue.toFixed(2),
        priceUsd: +btcPrice.toFixed(8),
        units: +units.toFixed(8),
        note: `Buy BTC`,
      });
      const ref = (res as any)?.referenceId || (res as any)?.id;
      if (!ref) throw new Error("Missing referenceId");

      // Optimistic: add BTC
      recordPendingDelta(ref, { BTC: +(+units.toFixed(8)) }, "Buy BTC");

      openOtp(ref);
    } catch (e: any) {
      showToast("err", e?.message || "Failed to start crypto buy.");
    } finally {
      setLoading(false);
    }
  }

  // SWAP: BTC base. Must involve BTC.
  async function handleSwap() {
    if (!swapInvolvesBTC) {
      showToast("err", "Swaps must include BTC (BTC is your base).");
      return;
    }
    if (swapFromId === swapToId) {
      showToast("err", "Select two different assets.");
      return;
    }
    if (!(fromPrice > 0) || !(toPrice > 0)) {
      showToast("err", "Price unavailable.");
      return;
    }
    const fromSym = COINS.find((c) => c.id === swapFromId)!.symbol;
    const toSym = COINS.find((c) => c.id === swapToId)!.symbol;

    // Validate balances
    const fromUnitsNumParsed = Number(String(swapFromUnits).replace(/[,\s]/g, ""));
    if (!isFinite(fromUnitsNumParsed) || fromUnitsNumParsed <= 0) {
      showToast("err", "Enter a valid source amount.");
      return;
    }
    const have = holdings[fromSym] ?? 0;
    if (fromUnitsNumParsed > have + 1e-12) {
      showToast("err", `Insufficient ${fromSym} balance.`);
      return;
    }

    // Output units
    const estOut = fromUnitsNumParsed * (fromPrice / toPrice);
    const minOut = estOut * (1 - slippagePct / 100);

    const mode = fromSym === "BTC" ? "BUY_ALT_WITH_BTC" : "SELL_ALT_FOR_BTC";

    // BTC delta for ledger (optional audit)
    const btcDelta = mode === "BUY_ALT_WITH_BTC" ? -fromUnitsNumParsed : +estOut;

    try {
      setLoading(true);

      const res = await createCryptoSwap({
        route: "BTC_BASE",
        mode, // "BUY_ALT_WITH_BTC" | "SELL_ALT_FOR_BTC"
        fromSymbol: fromSym,
        toSymbol: toSym,
        fromUnits: +fromUnitsNumParsed.toFixed(8),
        estOut: +estOut.toFixed(8),
        minOut: +minOut.toFixed(8),
        slippagePct,
        prices: {
          fromUsd: +fromPrice.toFixed(8),
          toUsd: +toPrice.toFixed(8),
          btcUsd: +btcPrice.toFixed(8),
        },
        btcDelta: +btcDelta.toFixed(8),
        note:
          mode === "BUY_ALT_WITH_BTC"
            ? `Swap BTC→${toSym} (BTC base)`
            : `Swap ${fromSym}→BTC (BTC base)`,
      });

      const ref = (res as any)?.referenceId || (res as any)?.id;
      if (!ref) throw new Error("Missing referenceId");

      // Optimistic deltas
      const deltas: Record<string, number> =
        mode === "BUY_ALT_WITH_BTC"
          ? { BTC: -fromUnitsNumParsed, [toSym]: +estOut }
          : { [fromSym]: -fromUnitsNumParsed, BTC: +estOut };

      recordPendingDelta(ref, deltas, "Swap");

      openOtp(ref);
    } catch (e: any) {
      showToast("err", e?.message || "Failed to start swap.");
    } finally {
      setLoading(false);
    }
  }

  // SEND: on-chain (optimistic -selected coin)
  async function handleSend() {
    const units = Number(String(swapFromUnits).replace(/[,\s]/g, ""));
    if (!isFinite(units) || units <= 0) {
      showToast("err", "Enter a valid amount.");
      return;
    }
    const sym = COINS.find((c) => c.id === swapFromId)!.symbol;
    const have = holdings[sym] ?? 0;
    if (units > have + 1e-12) {
      showToast("err", `Insufficient ${sym} balance.`);
      return;
    }
    const toAddress = sendAddress.trim();
    if (!toAddress) {
      showToast("err", "Destination address required.");
      return;
    }
    try {
      setLoading(true);
      const res = await createCryptoSend({
        fromSymbol: sym,
        toAddress,
        amountUnits: +units.toFixed(8),
        network: sym === "BTC" ? "bitcoin" : "ethereum",
        note: `Send ${sym} on-chain`,
      });
      const ref = (res as any)?.referenceId || (res as any)?.id;
      if (!ref) throw new Error("Missing referenceId");

      // Optimistic: reduce the coin (if BTC, "minuses from btc logic")
      recordPendingDelta(ref, { [sym]: -units }, "Send");

      openOtp(ref);
    } catch (e: any) {
      showToast("err", e?.message || "Failed to start send.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit() {
    const ref = otpRef;
    if (!ref) {
      setOtpError("Missing reference.");
      return;
    }
    const code = otpCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    try {
      setOtpVerifying(true);
      setOtpError(null);

      await verifyTransferOtp(ref, code);

      showToast("ok", "OTP verified.");
      closeOtp();

      // Keep the optimistic state; backend approval will reconcile later.
      router.push(`/transfer/pending?ref=${encodeURIComponent(ref)}`);
    } catch (e: any) {
      setOtpError(e?.message || "Invalid code. Try again.");
    } finally {
      setOtpVerifying(false);
    }
  }

  /* --------------------------------- UI ---------------------------------- */
  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} />

      <section className="pt-[100px] container-x pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Back */}
          <div className="flex items-center gap-3 mb-6">
            <a
              href="/dashboard/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition"
            >
              <ArrowLeft className="h-5 w-5" /> Back to dashboard
            </a>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/20 grid place-items-center">
                  <Bitcoin className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold">$ → Crypto</h1>
                  <p className="text-white/70 text-sm mt-1">
                    Deposit BTC from external wallets, buy BTC with USD, swap using BTC as your base
                    asset, or initiate an on-chain send.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchQuotes}
                  className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2 text-sm"
                  title="Refresh now"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <select
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(Number(e.target.value))}
                  className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 text-sm"
                  title="Auto-refresh interval"
                >
                  <option value={5}>Every 5s</option>
                  <option value={10}>Every 10s</option>
                  <option value={15}>Every 15s</option>
                  <option value={30}>Every 30s</option>
                  <option value={60}>Every 60s</option>
                </select>
              </div>
            </div>

            {/* ====== Balance Cards (crypto holdings) ====== */}
            <BalanceCards
              holdings={holdings}
              prices={prices}
              pending={pending}
              formatFiat={formatFiat}
              fmtUnits={fmtUnits}
            />

            {/* Controls */}
            <div className="mt-8 grid md:grid-cols-[420px,1fr] gap-6">
              {/* Left controls / context */}
              <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5 space-y-5">
                {/* Price snapshot */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/70">BTC price</div>
                  <div className="text-base font-medium">
                    {btcPrice ? formatFiat(btcPrice) : "—"}
                  </div>
                </div>

                {/* Fiat balances (exact from API) */}
                <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">Checking</span>
                    <span className="font-medium">{formatFiat(checkingBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/70">Savings</span>
                    <span className="font-medium">{formatFiat(savingsBalance)}</span>
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3 text-xs text-white/70 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <b>BTC is your base asset.</b> You can swap between BTC and other supported coins.
                    ALT ↔ ALT flows route via BTC, so select BTC on one side of the pair.
                  </div>
                </div>

                {/* Meta */}
                <div className="text-xs text-white/60">Quotes provided by CoinGecko.</div>
                <div className="text-xs text-white/60">
                  {lastUpdated ? (
                    <>
                      Last updated:{" "}
                      <span className="text-white/80">{lastUpdated.toLocaleTimeString()}</span>
                    </>
                  ) : (
                    "Fetching live quotes…"
                  )}
                </div>
                {err && (
                  <div className="text-rose-300 text-sm inline-flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {err}
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5">
                {/* Tabs */}
                <div className="flex items-center gap-2">
                  <TabButton active={tab === "deposit"} onClick={() => setTab("deposit")}>
                    Deposit BTC
                  </TabButton>
                  <TabButton active={tab === "buy"} onClick={() => setTab("buy")}>
                    Buy BTC
                  </TabButton>
                  <TabButton active={tab === "swap"} onClick={() => setTab("swap")}>
                    Swap (BTC base)
                  </TabButton>
                  <TabButton active={tab === "send"} onClick={() => setTab("send")}>
                    Send
                  </TabButton>
                </div>

                {/* DEPOSIT */}
                {tab === "deposit" && (
                  <div className="mt-5">
                    <div className="flex items-center gap-3">
                      <CoinBadge coinId="bitcoin" />
                      <div>
                        <div className="text-sm text-white/70">Your Horizon BTC deposit address</div>
                        <div className="text-2xl font-semibold">BTC</div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/20 bg-white/[0.03] p-4">
                      <div className="text-sm text-white/70">Address</div>
                      <div className="mt-1 font-mono text-sm break-all">
                        {btcAddrLoading ? "Loading…" : btcAddress || "—"}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <CopyButton value={btcAddress} disabled={!btcAddress || btcAddrLoading} />
                        {!btcAddress && !btcAddrLoading && (
                          <a
                            href="/onboarding"
                            className="text-xs underline text-white/80 hover:text-white"
                          >
                            Add a BTC address in Onboarding (Wallets)
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-white/60 mt-3">
                        Use this address to transfer BTC from your other wallets or exchanges into
                        Horizon. Deposits are credited to your BTC balance after blockchain
                        confirmation and internal review.
                      </div>
                      <div className="text-[11px] text-white/40 mt-2">
                        Source: <span className="font-medium">/users/me</span> (wallets){" "}
                        {btcAddress ? "(live from API)" : "(fallback: local cache)"}
                      </div>
                    </div>
                  </div>
                )}

                {/* BUY */}
                {tab === "buy" && (
                  <>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <CoinBadge coinId={BTC.id} />
                        <div>
                          <div className="text-sm text-white/70">{BTC.name}</div>
                          <div className="text-2xl font-semibold">{BTC.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white/60">Price</div>
                        <div className="text-base font-medium">
                          {btcPrice ? formatFiat(btcPrice) : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Amount in USD */}
                    <div className="mt-5">
                      <label className="text-sm text-white/70">Amount in USD</label>
                      <div className="mt-2 relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
                        <input
                          inputMode="decimal"
                          value={usd}
                          onChange={(e) => setUsd(e.target.value)}
                          onBlur={() => {
                            const n = Number(String(usd).replace(/[,$\s]/g, ""));
                            if (isFinite(n))
                              setUsd(
                                n.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              );
                          }}
                          placeholder="0.00"
                          className="w-full rounded-2xl bg-white/10 border border-white/20 pl-11 pr-4 py-3 text-lg shadow-inner"
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {[100, 250, 500, 1000].map((v) => (
                          <button
                            key={v}
                            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                            onClick={() =>
                              setUsd(
                                v.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              )
                            }
                          >
                            {formatFiat(v)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pay from */}
                    <div className="mt-4">
                      <label className="text-sm text-white/70">Pay from</label>
                      <select
                        value={payFrom}
                        onChange={(e) => setPayFrom(e.target.value as AccountType)}
                        className="mt-2 w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-base"
                      >
                        <option value="Checking">
                          Checking — {formatFiat(checkingBalance)}
                        </option>
                        <option value="Savings">Savings — {formatFiat(savingsBalance)}</option>
                      </select>
                    </div>

                    {/* You get */}
                    <div className="mt-5">
                      <div className="text-sm text-white/70">You get</div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div className="text-3xl font-bold">
                          {fmtUnits(buyUnits, BTC.decimals ?? 8)}{" "}
                          <span className="text-white/60 text-lg">{BTC.symbol}</span>
                        </div>
                        <CopyAmountButton value={buyUnits.toString()} />
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        Based on {formatFiat(usdValue)} at current price.
                      </div>
                    </div>

                    {/* Holdings quick view */}
                    <div className="mt-4 rounded-xl border border-white/20 bg-white/[0.03] p-4">
                      <div className="text-sm text-white/70">My holdings in BTC</div>
                      <div className="text-xl font-semibold mt-1">
                        {fmtUnits(holdings.BTC ?? 0, BTC.decimals ?? 8)}
                        <span className="text-white/60 text-base ml-1">{BTC.symbol}</span>
                      </div>
                      <div className="text-sm text-white/60 mt-1">
                        ≈ {formatFiat(((holdings.BTC ?? 0) * (btcPrice || 0)) || 0)}
                      </div>
                    </div>

                    <button
                      onClick={handleBuyBtc}
                      disabled={!(btcPrice > 0 && usdValue > 0 && buyUnits > 0)}
                      className={`mt-3 w-full px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                        btcPrice > 0 && usdValue > 0 && buyUnits > 0
                          ? ""
                          : "opacity-60 cursor-not-allowed"
                      }`}
                      style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                    >
                      Submit Buy (OTP + admin approval)
                    </button>
                    <div className="mt-2 text-xs text-white/60">
                      Confirm with OTP. After approval, the equivalent BTC is credited to your
                      crypto balance.
                    </div>
                  </>
                )}

                {/* SWAP (BTC base) */}
                {tab === "swap" && (
                  <div className="mt-5">
                    {/* From / To pickers */}
                    <div className="grid sm:grid-cols-[1fr,auto,1fr] items-end gap-3">
                      <div>
                        <label className="text-sm text-white/70">From</label>
                        <CoinSelect value={swapFromId} onChange={setSwapFromId} />
                        <div className="mt-1 text-xs text-white/60">
                          Balance:{" "}
                          {fmtUnits(holdings[fromCoin.symbol] ?? 0, fromCoin.decimals ?? 6)}{" "}
                          {fromCoin.symbol}
                        </div>
                      </div>

                      <div className="grid place-items-center pb-2">
                        <button
                          className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 grid place-items-center hover:bg-white/15"
                          onClick={() => {
                            setSwapFromId(swapToId);
                            setSwapToId(swapFromId);
                            setReversed((v) => !v);
                          }}
                          title="Flip"
                        >
                          <ArrowRightLeft
                            className={`h-5 w-5 ${reversed ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>

                      <div>
                        <label className="text-sm text-white/70">To</label>
                        <CoinSelect value={swapToId} onChange={setSwapToId} />
                        <div className="mt-1 text-xs text-white/60">
                          Balance:{" "}
                          {fmtUnits(holdings[toCoin.symbol] ?? 0, toCoin.decimals ?? 6)}{" "}
                          {toCoin.symbol}
                        </div>
                      </div>
                    </div>

                    {/* Amount input */}
                    <div className="mt-4">
                      <label className="text-sm text-white/70">
                        Amount ({fromCoin.symbol})
                      </label>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          inputMode="decimal"
                          value={swapFromUnits}
                          onChange={(e) => setSwapFromUnits(e.target.value)}
                          className="flex-1 rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-base"
                          placeholder={`0.0 ${fromCoin.symbol}`}
                        />
                        <button
                          className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                          onClick={() =>
                            setSwapFromUnits(String(+(holdings[fromCoin.symbol] ?? 0)))
                          }
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    {/* BTC base notice */}
                    {!swapInvolvesBTC && (
                      <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-200 inline-flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Swaps must include BTC (BTC is your base asset). Select BTC on either the
                        “From” or “To” side.
                      </div>
                    )}

                    {/* Quote panel */}
                    <div className="mt-4 rounded-xl border border-white/20 bg-white/[0.03] p-4">
                      <div className="grid sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-white/60">Rate</div>
                          <div className="mt-1">
                            1 {fromCoin.symbol} ≈{" "}
                            {toPrice > 0 && fromPrice > 0
                              ? fmtUnits(fromPrice / toPrice, toCoin.decimals ?? 6)
                              : "—"}{" "}
                            {toCoin.symbol}
                          </div>
                          <div className="text-white/50 mt-0.5">
                            via USD ({formatFiat(fromPrice)} / {formatFiat(toPrice)})
                          </div>
                        </div>
                        <div>
                          <div className="text-white/60">Estimated receive</div>
                          <div className="mt-1 text-white font-medium">
                            {fmtUnits(quoteOut, toCoin.decimals ?? 6)} {toCoin.symbol}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/60">Slippage</div>
                          <div className="mt-1 flex items-center gap-2">
                            {[0.1, 0.5, 1].map((p) => (
                              <button
                                key={p}
                                onClick={() => setSlippagePct(p)}
                                className={`px-3 py-1.5 rounded-xl border text-xs ${
                                  slippagePct === p
                                    ? "bg-[#00E0FF]/15 border-[#00E0FF]/40"
                                    : "bg-white/10 border-white/20 hover:bg-white/[0.12]"
                                }`}
                              >
                                {p}%
                              </button>
                            ))}
                          </div>
                          <div className="text-white/50 mt-1">
                            Min received:{" "}
                            {fmtUnits(minReceived, toCoin.decimals ?? 6)} {toCoin.symbol}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSwap}
                      disabled={
                        !swapInvolvesBTC ||
                        !(fromUnitsNum > 0 && fromPrice > 0 && toPrice > 0) ||
                        swapFromId === swapToId ||
                        (holdings[fromCoin.symbol] ?? 0) < fromUnitsNum - 1e-12
                      }
                      className={`mt-4 w-full px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                        swapInvolvesBTC &&
                        fromUnitsNum > 0 &&
                        fromPrice > 0 &&
                        toPrice > 0 &&
                        swapFromId !== swapToId &&
                        (holdings[fromCoin.symbol] ?? 0) >= fromUnitsNum - 1e-12
                          ? ""
                          : "opacity-60 cursor-not-allowed"
                      }`}
                      style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                    >
                      Submit Swap (OTP + admin approval)
                    </button>

                    <div className="mt-2 text-xs text-white/60">
                      BTC remains the reference asset. We apply an optimistic update and mark the
                      swap as pending; final balances are confirmed after backend approval.
                    </div>
                  </div>
                )}

                {/* SEND */}
                {tab === "send" && (
                  <div className="mt-5">
                    <div className="grid gap-4">
                      {/* asset selector */}
                      <div>
                        <label className="text-sm text-white/70">Asset</label>
                        <CoinSelect value={swapFromId} onChange={setSwapFromId} />
                        <div className="mt-1 text-xs text-white/60">
                          Balance:{" "}
                          {fmtUnits(holdings[fromCoin.symbol] ?? 0, fromCoin.decimals ?? 6)}{" "}
                          {fromCoin.symbol}
                        </div>
                      </div>

                      {/* amount in units */}
                      <div>
                        <label className="text-sm text-white/70">
                          Amount ({fromCoin.symbol})
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            inputMode="decimal"
                            value={swapFromUnits}
                            onChange={(e) => setSwapFromUnits(e.target.value)}
                            className="flex-1 rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-base"
                            placeholder={`0.0 ${fromCoin.symbol}`}
                          />
                          <button
                            className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                            onClick={() =>
                              setSwapFromUnits(String(+(holdings[fromCoin.symbol] ?? 0)))
                            }
                          >
                            Max
                          </button>
                        </div>
                      </div>

                      {/* destination address */}
                      <div>
                        <label className="text-sm text-white/70">Destination address</label>
                        <input
                          value={sendAddress}
                          onChange={(e) => setSendAddress(e.target.value)}
                          className="mt-2 w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-base"
                          placeholder={`Paste ${fromCoin.symbol} address`}
                        />
                      </div>

                      {/* network (fixed for demo) */}
                      <div>
                        <label className="text-sm text-white/70">Network</label>
                        <select
                          value={fromCoin.symbol === "BTC" ? "bitcoin" : "ethereum"}
                          onChange={() => {}}
                          className="mt-2 w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-base"
                          disabled
                          title="Basic example; wire your selectable networks as needed"
                        >
                          <option value="bitcoin">bitcoin</option>
                          <option value="ethereum">ethereum</option>
                        </select>
                      </div>

                      <button
                        onClick={handleSend}
                        disabled={
                          !Number(swapFromUnits) ||
                          (holdings[fromCoin.symbol] ?? 0) <
                            Number(swapFromUnits) - 1e-12 ||
                          !sendAddress
                        }
                        className={`w-full px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                          Number(swapFromUnits) &&
                          (holdings[fromCoin.symbol] ?? 0) >=
                            Number(swapFromUnits) - 1e-12 &&
                          sendAddress
                            ? ""
                            : "opacity-60 cursor-not-allowed"
                        }`}
                        style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                      >
                        Submit Send (OTP + admin approval)
                      </button>

                      <div className="text-xs text-white/60">
                        We apply an optimistic debit to your {fromCoin.symbol} holdings and mark the
                        transaction as pending. Final settlement is completed after OTP
                        verification and admin approval.
                      </div>
                    </div>
                  </div>
                )}

                {/* OTP Drawer */}
                <OtpDrawer
                  open={otpOpen}
                  referenceId={otpRef}
                  code={otpCode}
                  setCode={setOtpCode}
                  verifying={otpVerifying}
                  error={otpError}
                  onSubmit={handleOtpSubmit}
                  onClose={closeOtp}
                />
              </div>
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div
              className={`mt-6 rounded-2xl border p-4 text-sm flex items-start gap-3 ${
                toast.kind === "ok"
                  ? "border-emerald-400/30 bg-emerald-500/10"
                  : "border-rose-400/30 bg-rose-500/10"
              }`}
            >
              {toast.kind === "ok" ? (
                <Check className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-300 shrink-0 mt-0.5" />
              )}
              <div>{toast.msg}</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* ------------------------------ Balance Cards ------------------------------ */
function BalanceCards({
  holdings,
  prices,
  pending,
  formatFiat,
  fmtUnits,
}: {
  holdings: Holdings;
  prices: Record<string, { usd: number }>;
  pending: Record<string, PendingDelta>;
  formatFiat: (n: number) => string;
  fmtUnits: (n: number, d?: number) => string;
}) {
  const symbols = Object.keys(holdings).sort((a, b) =>
    a === "BTC" ? -1 : b === "BTC" ? 1 : a.localeCompare(b)
  );

  if (symbols.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.03] p-4 text-sm text-white/70">
        No crypto holdings yet. Buy BTC or complete a swap to see cards here.
      </div>
    );
  }

  return (
    <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {symbols.map((sym) => {
        const coin = COIN_BY_SYMBOL[sym];
        const id = coin?.id;
        const units = holdings[sym] ?? 0;
        const price = id ? prices[id]?.usd ?? 0 : 0;
        const value = units * price;

        // pending badge if any open deltas for this coin
        const pendingForCoin = Object.values(pending).some(
          (p) => (p.deltas[sym] || 0) !== 0
        );

        return (
          <div
            key={sym}
            className="rounded-2xl border border-white/20 bg-white/[0.04] p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/20 grid place-items-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {coin?.logo ? (
                  <img src={coin.logo} alt={sym} className="h-6 w-6 object-contain" />
                ) : (
                  <span>{sym}</span>
                )}
              </div>
              <div>
                <div className="text-sm text-white/70">{coin?.name || sym}</div>
                <div className="text-xl font-semibold">
                  {fmtUnits(units, coin?.decimals ?? 6)}{" "}
                  <span className="text-white/60 text-sm">{sym}</span>
                </div>
                <div className="text-xs text-white/60 mt-0.5">
                  ≈ {formatFiat(value || 0)}
                </div>
              </div>
            </div>
            {pendingForCoin && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                <Clock className="h-3.5 w-3.5" /> Pending
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Subcomponents ------------------------------ */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-2xl text-sm border transition-all ${
        active
          ? "bg-[#00E0FF]/15 border-[#00E0FF]/40"
          : "bg-white/10 border-white/20 hover:bg-white/[0.12]"
      }`}
    >
      {children}
    </button>
  );
}

function CopyAmountButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm inline-flex items-center gap-2"
      title="Copy amount"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  }
  return (
    <button
      onClick={copy}
      disabled={disabled}
      className={`px-3 py-2 rounded-xl border text-sm inline-flex items-center gap-2 ${
        disabled
          ? "bg-white/5 border-white/15 opacity-60 cursor-not-allowed"
          : "bg-white/10 border-white/20 hover:bg-white/15"
      }`}
      title="Copy address"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}

/* Tiny coin badge with logo (fallback to ticker) */
function CoinBadge({ coinId }: { coinId: string }) {
  const c = COINS.find((x) => x.id === coinId)!;
  const [err, setErr] = useState(false);
  return (
    <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/20 grid place-items-center overflow-hidden">
      {!err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.logo}
          alt={c.symbol}
          className="h-6 w-6 object-contain"
          onError={() => setErr(true)}
          draggable={false}
        />
      ) : (
        <span className="text-xs font-semibold">{c.symbol}</span>
      )}
    </div>
  );
}

/* Coin dropdown with search + logos (used by Swap & Send) */
function CoinSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = COINS.find((c) => c.id === value)!;
  const filtered = COINS.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.symbol.toLowerCase().includes(q.toLowerCase())
  );

  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white/10 border border-white/20 px-4 py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-white/10 border border-white/20 grid place-items-center overflow-hidden">
            {!imgErr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.logo}
                alt={selected.symbol}
                className="h-5 w-5 object-contain"
                onError={() => setImgErr(true)}
                draggable={false}
              />
            ) : (
              <span className="text-[10px] font-semibold">{selected.symbol}</span>
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium">{selected.name}</div>
            <div className="text-xs text-white/60">{selected.symbol}</div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 opacity-80 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full rounded-2xl border border-white/20 bg-[#0F1622] shadow-[0_12px_48px_rgba(0,0,0,0.6)]">
          <div className="p-3 border-b border-white/10">
            <input
              placeholder="Search coin…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                className="w-full text-left px-4 py-3 hover:bg-white/[0.06] flex items-center gap-3"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                  setImgErr(false);
                }}
              >
                <div className="h-7 w-7 rounded-xl bg-white/10 border border-white/20 grid place-items-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.logo}
                    alt={c.symbol}
                    className="h-5 w-5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      (e.currentTarget.parentElement as HTMLElement).textContent = c.symbol;
                      (e.currentTarget.parentElement as HTMLElement).classList.add(
                        "text-[10px]",
                        "font-semibold"
                      );
                    }}
                    draggable={false}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-white/60">{c.symbol}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-white/60">No coins match.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* OTP Drawer (drop-down) */
function OtpDrawer({
  open,
  referenceId,
  code,
  setCode,
  verifying,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  referenceId: string | null;
  code: string;
  setCode: (v: string) => void;
  verifying: boolean;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={`mt-5 overflow-hidden rounded-2xl border transition-[max-height,opacity,transform] duration-300 ${
        open ? "max-height-[260px] max-h-[260px] opacity-100" : "max-h-0 opacity-0"
      } ${open ? "border-white/20 bg-white/[0.05]" : "border-transparent bg-transparent"}`}
      aria-hidden={!open}
    >
      {open && (
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-[#00E0FF]" />
              <span className="text-white/80 font-medium">Two-step verification</span>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/10 border border-white/20 grid place-items-center hover:bg-white/15"
              aria-label="Close OTP"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 text-xs text-white/60">
            We’ve sent a 6-digit code to your verified device or email. Enter it below to confirm
            this action.
          </div>

          <div className="mt-4 grid gap-3">
            {referenceId && (
              <div className="text-xs text-white/60">
                Reference: <span className="text-white/80 font-mono">{referenceId}</span>
              </div>
            )}
            <div className="relative">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit();
                }}
                className="w-full text-center tracking-[0.6em] caret-transparent rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-lg font-semibold"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                {code ? "" : "Enter 6-digit code"}
              </div>
            </div>

            {error && (
              <div className="text-rose-300 text-sm inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={onSubmit}
                disabled={verifying || code.replace(/\D/g, "").length !== 6}
                className={`px-4 py-3 rounded-2xl text-[#0B0F14] ${
                  verifying || code.replace(/\D/g, "").length !== 6
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
                style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {verifying ? "Verifying…" : "Verify & Continue"}
              </button>
              <button
                onClick={onClose}
                disabled={verifying}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15"
              >
                Cancel
              </button>
            </div>

            <div className="text-[11px] text-white/45">
              Having trouble? Make sure you’re using the most recent OTP linked to this request.
              Resend and expiry handling is managed by your backend OTP flow.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
