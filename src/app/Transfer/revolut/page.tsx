// app/dashboard/transfers/revolut/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import { useRouter } from "next/navigation";
import API, { afterCreateTransfer, verifyTransferOtp } from "@/libs/api";

type AccountKind = "Checking" | "Savings";

/* ── Money formatters ── */
const USD_FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const NUM2_FMT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function RevolutSendPage() {
  const router = useRouter();

  /* --------------------------- User + balances --------------------------- */
  const [userName, setUserName] = useState("User");
  const [checking, setChecking] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await API.me(); // { user: {...} } or user object
        if (cancelled) return;
        const u: any = (me as any)?.user ?? me;

        const full =
          [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
          u?.fullName || u?.handle || "User";
        setUserName(full);

        setChecking(Number(u?.balances?.checking ?? 0));
        setSavings(Number(u?.balances?.savings ?? 0));
      } catch {
        // dev fallback to localStorage
        if (typeof window !== "undefined") {
          setUserName(localStorage.getItem("hb_user_name") || "User");
          setChecking(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
          setSavings(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [payFrom, setPayFrom] = useState<AccountKind>("Checking");
  // pick the richer account once balances hydrate
  useEffect(() => {
    if (!isHydrated) return;
    setPayFrom((checking ?? 0) >= (savings ?? 0) ? "Checking" : "Savings");
  }, [isHydrated, checking, savings]);

  /* -------------------------------- Form -------------------------------- */
  const [amount, setAmount] = useState<string>("50.00");
  const [recipient, setRecipient] = useState<string>("");
  const [useLink, setUseLink] = useState(false);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const balance = payFrom === "Checking" ? checking : savings;
  const fmt = (n: number) => USD_FMT.format(n);

  // Accept phone, email, @revtag/bare tag, or Revolut link
  function isValidRecipient(v: string) {
    const s = v.trim();
    const phone = /^\+?[0-9\s().-]{7,}$/.test(s);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const revtag = /^@?[\w.-]{3,32}$/.test(s);
    const link = /^https?:\/\/(www\.)?revolut\.link\/.+/i.test(s);
    return phone || email || revtag || link;
  }

  function normalizeRecipient(v: string) {
    const s = v.trim();
    const isTag = /^@?[\w.-]{3,32}$/.test(s);
    return isTag ? (s.startsWith("@") ? s : `@${s}`) : s; // tags normalized to @tag
  }

  const amtNum = useMemo(() => {
    const n = Number(String(amount).replace(/[,$\s]/g, ""));
    return isFinite(n) ? n : 0;
  }, [amount]);

  async function handleSend() {
    if (!isValidRecipient(recipient)) {
      alert("Enter a valid phone, email, Revtag, or Revolut payment link.");
      return;
    }
    if (amtNum <= 0 || !isFinite(amtNum)) {
      alert("Enter a valid amount.");
      return;
    }
    // soft guard when exceeding visible balance
    if (amtNum > balance) {
      const ok = confirm(
        `Amount exceeds your visible ${payFrom} balance (${fmt(balance)}). Continue anyway?`
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      const recipientNormalized = normalizeRecipient(recipient);

      // Call the rail-specific endpoint (your backend expects these flat fields)
      const res: any = await API.createRevolut({
        fromAccount: payFrom,
        recipient: recipientNormalized,
        amount: +amtNum.toFixed(2),
        note: note || undefined,
        method: useLink ? "payment_link" : "direct",
      });

      const referenceId =
        res?.referenceId ||
        ("REV-" + Math.random().toString(36).slice(2, 10).toUpperCase());

      // Minimal local fallback for Pending
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: res?.status || "OTP_REQUIRED",
            rail: "revolut",
            createdAt: res?.createdAt || new Date().toISOString(),
            etaText: res?.etaText || "Awaiting approval",
            amount: { value: +amtNum.toFixed(2), currency: "USD" },
            fees: { app: typeof res?.fee === "number" ? res.fee : 0, currency: "USD" },
            sender: { accountName: payFrom },
            recipient: { name: recipientNormalized, tag: recipientNormalized },
            referenceId,
            note: note || undefined,
            cancelable: true,
          })
        );
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      // Prompt for OTP and confirm
      const code = (window.prompt("Enter the 6-digit OTP to confirm this Revolut transfer:") || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (code.length !== 6) throw new Error("Invalid code. Please enter the 6-digit OTP.");

      await verifyTransferOtp(referenceId, code);

      // Pending handoff (universal)
      afterCreateTransfer(router, {
        ...res,
        referenceId,
        rail: "revolut",
        amount: { value: +amtNum.toFixed(2), currency: "USD" },
        sender: { accountName: payFrom },
        recipient: { name: recipientNormalized, tag: recipientNormalized },
        note,
      });
    } catch (err: any) {
      alert(err?.message || "Couldn't submit Revolut transfer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={isHydrated ? userName : "User"} />
      <section className="pt-[120px] container-x pb-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Send with Revolut</h1>
          <p className="text-sm text-white/70 mb-4">
            Use a phone, email, Revtag, or Revolut payment link to send money.
          </p>

          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/20 space-y-3">
            <label className="text-sm text-white/70">Recipient</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="+1 555-555-5555 • user@email.com • @revtag • https://revolut.link/…"
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
            />

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useLink} onChange={(e) => setUseLink(e.target.checked)} />
              <span className="text-white/70">Use payment link</span>
            </label>

            <label className="text-sm text-white/70">Amount (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                const n = Number(String(amount).replace(/[,$\s]/g, "")) || 0;
                setAmount(NUM2_FMT.format(n));
              }}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
            />

            <label className="text-sm text-white/70">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
            />

            <label className="text-sm text-white/70">Pay from</label>
            <select
              value={payFrom}
              onChange={(e) => setPayFrom(e.target.value as AccountKind)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
            >
              <option value="Checking" suppressHydrationWarning>
                Checking — {fmt(isHydrated ? checking : 0)}
              </option>
              <option value="Savings" suppressHydrationWarning>
                Savings — {fmt(isHydrated ? savings : 0)}
              </option>
            </select>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={loading}
                className="px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)]"
                style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {loading ? "Submitting…" : "Send with Revolut"}
              </button>
              <button
                onClick={() => router.push("/Transfer")}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
