// app/Transfer/cashapp/page.tsx
"use client";

import { useEffect, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import { useRouter } from "next/navigation";
import { DollarSign, AtSign } from "lucide-react";

// Canonical API helpers
import {
  me,
  myAccounts,
  createCashApp,
  verifyTransferOtp,
  afterCreateTransfer,
} from "@/libs/api";

type AccountKind = "Checking" | "Savings";

export default function CashAppSendPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [checking, setChecking] = useState<number>(5023.75);
  const [savings, setSavings] = useState<number>(8350.2);
  const [payFrom, setPayFrom] = useState<AccountKind>("Checking");

  const [recipient, setRecipient] = useState<string>("$yourfriend");
  const [amount, setAmount] = useState<string>("25.00");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await me();
        setUserName(profile?.name || profile?.firstName || "User");

        const acct = await myAccounts();
        if (acct?.checking?.available != null) setChecking(acct.checking.available);
        if (acct?.savings?.available != null) setSavings(acct.savings.available);
      } catch {
        // non-blocking fallback (demo/local)
        try {
          setUserName(localStorage.getItem("hb_user_name") || "User");
          setChecking(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
          setSavings(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
        } catch {}
      }
    })();
  }, []);

  function fmt(n: number) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function isValidRecipient(v: string) {
    const s = v.trim();
    const cashtag = /^\$[a-z0-9_]{1,20}$/i.test(s);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const phone = /^\+?[0-9\s().-]{7,}$/.test(s);
    return cashtag || email || phone;
  }

  async function handleSend() {
    const n = Number(String(amount).replace(/[,$\s]/g, ""));
    if (!isValidRecipient(recipient)) {
      alert("Enter a valid $cashtag, phone number, or email.");
      return;
    }
    if (!isFinite(n) || n <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    // Optional: balance guard (can be removed if you allow overdraft)
    const balance = payFrom === "Checking" ? checking : savings;
    if (n > balance) {
      if (
        !confirm(
          `Amount exceeds your visible ${payFrom} balance (${fmt(balance)}). Continue anyway?`
        )
      ) {
        return;
      }
    }

    try {
      setSubmitting(true);

      // Backend contract (mirrors other rails): { fromAccount, recipient, amount, note }
      // Server issues OTP challenge and returns { referenceId, status:"OTP_REQUIRED", ... }
      const res: any = await createCashApp({
        fromAccount: payFrom,
        recipient: recipient.trim(),
        amount: +n.toFixed(2),
        note: note || undefined,
      });

      const referenceId =
        res?.referenceId ||
        res?.id ||
        ("CASH-" + Math.random().toString(36).slice(2, 10).toUpperCase());

      // Save local snapshot so Pending can render if network hiccups before OTP verify
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: res?.status || "OTP_REQUIRED",
            rail: "cashapp",
            createdAt: res?.createdAt || new Date().toISOString(),
            amount: { value: +n.toFixed(2), currency: "USD" },
            sender: { accountName: payFrom },
            recipient: { name: recipient.trim(), tag: recipient.trim() },
            referenceId,
            note: note || undefined,
            cancelable: true,
          })
        );
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      // OTP prompt + verify against this transfer ref
      const code = (window.prompt("Enter the 6-digit OTP to confirm this Cash App transfer:") || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (code.length !== 6) {
        throw new Error("Invalid code. Please enter the 6-digit OTP.");
      }

      await verifyTransferOtp(referenceId, code);

      // Universal pending handoff (saves + routes to /Transfer/pending?ref=...)
      afterCreateTransfer(router, {
        ...res,
        referenceId,
        rail: "cashapp",
        recipient: { name: recipient.trim(), tag: recipient.trim() },
        note,
        status: "PENDING_ADMIN",
      });
    } catch (e: any) {
      alert(e?.message || "Failed to start Cash App transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} />
      <section className="pt-[120px] container-x pb-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Send with Cash App</h1>

          <div className="rounded-2xl border border-white/20 bg-white/[0.03] p-5 space-y-4">
            <label className="text-sm text-white/70">Recipient ($cashtag / phone / email)</label>
            <div className="grid sm:grid-cols-[1fr,auto,auto] gap-2">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
                placeholder="$cashtag or +1 555-555-5555 or user@example.com"
              />
              <div className="hidden sm:grid place-items-center px-3 rounded-2xl bg-white/10 border border-white/20">
                <DollarSign className="opacity-80" />
              </div>
              <div className="hidden sm:grid place-items-center px-3 rounded-2xl bg-white/10 border border-white/20">
                <AtSign className="opacity-80" />
              </div>
            </div>

            <label className="text-sm text-white/70">Amount (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-lg"
              inputMode="decimal"
              placeholder="0.00"
            />

            <label className="text-sm text-white/70">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
              placeholder="For lunch 🥗"
            />

            <label className="text-sm text-white/70">Pay from</label>
            <select
              value={payFrom}
              onChange={(e) => setPayFrom(e.target.value as AccountKind)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
            >
              <option value="Checking">Checking — {fmt(checking)}</option>
              <option value="Savings">Savings — {fmt(savings)}</option>
            </select>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSend}
                disabled={submitting}
                className="px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] border border-[#00E0FF]/40"
              >
                {submitting ? "Processing…" : "Send with Cash App"}
              </button>
              <button
                onClick={() => router.push("/Transfer")}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20"
              >
                Cancel
              </button>
            </div>

            <div className="text-xs text-white/60 pt-1">
              You’ll confirm this transfer with a one-time passcode (OTP).
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
