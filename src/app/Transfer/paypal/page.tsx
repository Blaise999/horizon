// app/dashboard/transfers/paypal/page.tsx
"use client";

import { useEffect, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import { useRouter } from "next/navigation";
import { Mail, ChevronDown, LockKeyhole, Loader2 } from "lucide-react";
import { createPayPal, meBalances } from "@/libs/api";

type AccountKind = "Checking" | "Savings";

export default function PayPalSendPage() {
  const router = useRouter();

  // display + balances (from DB)
  const [userName, setUserName] = useState("User");
  const [checking, setChecking] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [balancesLoaded, setBalancesLoaded] = useState(false);

  // form
  const [payFrom, setPayFrom] = useState<AccountKind>("Checking");
  const [amount, setAmount] = useState<string>("25.00");
  const [recipient, setRecipient] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // ui state
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // inline OTP
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [transferRef, setTransferRef] = useState<string | null>(null);

  // --- Load balances from MongoDB via API ---
  async function loadBalances() {
    try {
      const b = await meBalances(); // -> { checking: number, savings: number }
      setChecking(Number(b.checking ?? 0));
      setSavings(Number(b.savings ?? 0));
      setBalancesLoaded(true);
    } catch (e: any) {
      setErrorText(e?.message || "Could not load balances.");
      setBalancesLoaded(true); // avoid blocking UI
    }
  }

  useEffect(() => {
    // optional: keep your stored display name if you use it elsewhere
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("hb_user_name") || "User");
    }
    loadBalances();
  }, []);

  function formatFiat(n: number) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function isValidRecipient(v: string) {
    const s = v.trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const phone = /^\+?[0-9\s().-]{7,}$/.test(s);
    const username =
      /^[a-zA-Z0-9._-]{3,32}$/.test(s) || /^paypal\.me\/[a-z0-9._-]{3,32}$/i.test(s);
    return email || phone || username;
  }

  async function handleSend() {
    const n = Number(String(amount).replace(/[$,\s]/g, ""));
    setErrorText(null);
    setOtpError(null);

    if (!isValidRecipient(recipient)) {
      setErrorText("Enter a valid PayPal username, email, or phone number.");
      return;
    }
    if (!isFinite(n) || n <= 0) {
      setErrorText("Enter a valid amount.");
      return;
    }

    // Use LIVE balances from DB for guard
    const available = payFrom === "Checking" ? checking : savings;
    if (balancesLoaded && n > available) {
      setErrorText(`Insufficient ${payFrom} balance.`);
      return;
    }

    setLoading(true);
    try {
      const res = await createPayPal({
        fromAccount: payFrom,
        recipient: recipient.trim(),
        amount: +n.toFixed(2),
        note: note || undefined,
      });

      const ref =
        (res as any)?.ref ||
        (res as any)?.referenceId ||
        (res as any)?.id ||
        null;

      const requiresOtp =
        (res as any)?.requiresOtp === true ||
        (res as any)?.status === "OTP_REQUIRED" ||
        true;

      // Snapshot for pending handoff (we only navigate after OTP success)
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: requiresOtp ? "OTP_REQUIRED" : ((res as any)?.status || "pending"),
            rail: "paypal",
            amount: { value: +n.toFixed(2), currency: "USD" },
            recipient: recipient.trim(),
            referenceId: ref,
            createdAt: new Date().toISOString(),
            sender: { accountName: payFrom },
            note: note || undefined,
            cancelable: true,
          })
        );
      } catch {}

      if (ref && requiresOtp) {
        setTransferRef(ref);
        setShowOtp(true);
        if ((res as any)?.otpDevHint) {
          console.log("[DEV] OTP hint:", (res as any).otpDevHint);
        }
      } else {
        setErrorText("This transfer didn’t require OTP (unexpected in current policy).");
      }
    } catch (e: any) {
      setErrorText(e?.message || "Failed to submit PayPal transfer.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmOtpInline() {
    if (!transferRef) return;
    setOtpError(null);

    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setOtpError("Enter the 6-digit code.");
      return;
    }

    setOtpLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
      const r = await fetch(`${API_BASE}/transfers/${encodeURIComponent(transferRef)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code }),
      });
      const data = await r.json();
      if (!r.ok || data?.ok === false) {
        throw new Error(data?.error || "Invalid code");
      }

      // Refresh balances from DB after successful confirm
      await loadBalances();

      // Now open the pending page for this ref
      try {
        localStorage.setItem("hb_open_txn", "1");
      } catch {}
      router.push(`/Transfer/pending?ref=${encodeURIComponent(transferRef)}`);
    } catch (err: any) {
      setOtpError(err?.message || "Could not confirm code.");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} />
      <section className="pt-[120px] container-x pb-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-3">Send to PayPal</h1>

          {errorText && (
            <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorText}
            </div>
          )}

          <div className="rounded-2xl border border-white/20 bg-white/[0.03] p-5 space-y-4">
            <label className="text-sm text-white/70">Recipient (email / phone / PayPal username)</label>
            <div className="flex gap-2">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1 rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
                placeholder="recipient@example.com or +1 555-555-5555 or paypal.me/you"
              />
              <div className="grid place-items-center px-3">
                <Mail className="opacity-70" />
              </div>
            </div>

            <label className="text-sm text-white/70">Amount (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                const n = Number(String(amount).replace(/[^\d.]/g, "")) || 0;
                setAmount(
                  n.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                );
              }}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-lg"
              placeholder="0.00"
            />

            <label className="text-sm text-white/70">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
              placeholder="For dinner"
            />

            <label className="text-sm text-white/70">Pay from</label>
            <select
              value={payFrom}
              onChange={(e) => setPayFrom(e.target.value as AccountKind)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
            >
              <option value="Checking">Checking — {formatFiat(checking)}</option>
              <option value="Savings">Savings — {formatFiat(savings)}</option>
            </select>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSend}
                disabled={loading}
                className="px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)]"
                style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {loading ? "Submitting…" : "Send to PayPal"}
              </button>
              <button
                onClick={() => router.push("/Transfer")}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20"
              >
                Cancel
              </button>
            </div>

            {/* Inline OTP (no navigation until success) */}
            {transferRef && (
              <div className="mt-2 rounded-2xl border border-white/15 bg-white/5">
                <button
                  type="button"
                  onClick={() => setShowOtp((s) => !s)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <LockKeyhole className="h-4 w-4 opacity-80" />
                    <span className="opacity-90">
                      One-Time Passcode required for ref{" "}
                      <span className="font-mono">{transferRef}</span>
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOtp ? "rotate-180" : ""}`} />
                </button>

                {showOtp && (
                  <div className="px-4 pb-4 space-y-3">
                    {otpError && (
                      <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                        {otpError}
                      </div>
                    )}
                    <label className="text-xs text-white/70">Enter 6-digit code</label>
                    <input
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 font-mono tracking-widest text-lg"
                      placeholder="••••••"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={confirmOtpInline}
                        disabled={otpLoading || !transferRef}
                        className="px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)]"
                        style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                      >
                        {otpLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                          </span>
                        ) : (
                          "Verify & Continue"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
