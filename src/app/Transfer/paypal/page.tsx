// app/dashboard/transfers/paypal/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import { useRouter } from "next/navigation";
import API, { initiateTransfer, verifyTransferOtp, afterCreateTransfer } from "@/libs/api";
import { Mail, ChevronDown, LockKeyhole, Loader2 } from "lucide-react";

type AccountKind = "Checking" | "Savings";

/* ── Hydration-safe formatters ── */
const USD_FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const NUM2_FMT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayPalSendPage() {
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
        const me = await API.me();
        if (cancelled) return;
        const u: any = (me as any)?.user ?? me;

        const full =
          [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
          u?.fullName ||
          u?.handle ||
          "User";
        setUserName(full);

        setChecking(Number(u?.balances?.checking ?? 0));
        setSavings(Number(u?.balances?.savings ?? 0));
      } catch {
        // Fallback (same as Venmo page)
        const n = typeof window !== "undefined" ? localStorage.getItem("hb_user_name") : null;
        if (n) setUserName(n);
        setChecking(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
        setSavings(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------- Form -------------------------------- */
  const [payFrom, setPayFrom] = useState<AccountKind>("Checking");
  useEffect(() => {
    if (!isHydrated) return;
    setPayFrom((checking ?? 0) >= (savings ?? 0) ? "Checking" : "Savings");
  }, [isHydrated, checking, savings]);

  const [amount, setAmount] = useState<string>("25.00");
  const [recipient, setRecipient] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Inline OTP (identical UX to Venmo)
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [transferRef, setTransferRef] = useState<string | null>(null);

  /* ------------------------------- Helpers ------------------------------- */
  function isValidRecipient(v: string) {
    const s = (v || "").trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    const phone = /^\+?[0-9\s().-]{7,}$/.test(s);
    const username =
      /^[a-zA-Z0-9._-]{3,32}$/.test(s) || /^paypal\.me\/[a-z0-9._-]{3,32}$/i.test(s);
    return email || phone || username;
  }

  const fmt = (n: number) => USD_FMT.format(n);
  const blurMoney = (v: string) => {
    const n = Number(String(v).replace(/[,$\s]/g, ""));
    if (!isFinite(n) || n === 0) return v.trim();
    return NUM2_FMT.format(n);
  };

  const balance = payFrom === "Checking" ? checking : savings;

  const amt = useMemo(() => {
    const n = Number(String(amount).replace(/[,$\s]/g, ""));
    return isFinite(n) ? n : 0;
  }, [amount]);

  const canSubmit = isValidRecipient(recipient) && amt > 0 && amt <= balance;

  /* ------------------------------- Submit ------------------------------- */
  async function handleSend() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErrorText(null);
    setOtpError(null);

    try {
      const recipientName = recipient.trim();
      if (!recipientName) throw new Error("Enter a valid recipient.");

      // 🚫 No recipient object. Use alias fields like Venmo page.
      const payload = {
        rail: "paypal",
        kind: "paypal",
        fromAccount: payFrom,
        amount: +amt.toFixed(2),
        currency: "USD",

        // Name aliases (API coalesces)
        recipientName,
        recipient_name: recipientName,
        ["Recipient Name"]: recipientName,

        note: note || undefined,
        schedule: { mode: "NOW" },
        adminQueue: true,
        adminSurface: "paypal",
      };

      const res: any = await initiateTransfer(payload);
      const referenceId =
        res?.referenceId ||
        res?.ref ||
        ("PP-" + Math.random().toString(36).slice(2, 10).toUpperCase());

      // Local snapshot (pending handoff happens after OTP success)
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: res?.status || "OTP_REQUIRED",
            rail: "paypal",
            createdAt: res?.createdAt || new Date().toISOString(),
            etaText: res?.eta || "Usually instant",
            amount: { value: res?.amount?.value ?? +amt.toFixed(2), currency: "USD" },
            fees: { app: typeof res?.fee === "number" ? res.fee : 0, currency: "USD" },
            sender: { accountName: payFrom },
            recipient: { name: recipientName },
            referenceId,
            note: note || undefined,
            cancelable: true,
          })
        );
      } catch {}

      setTransferRef(referenceId);
      setShowOtp(true);
      if (res?.otpDevHint) console.log("[DEV] OTP hint:", res.otpDevHint);
    } catch (err: any) {
      setErrorText(err?.message || "Couldn't start PayPal transfer.");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------- OTP Verify ------------------------------- */
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
      await verifyTransferOtp(transferRef, code);

      // Optional trace for UI on pending
      try {
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      const recipientName = recipient.trim();
      afterCreateTransfer(router, {
        referenceId: transferRef,
        rail: "paypal",
        status: "PENDING_ADMIN",
        amount: { value: +amt.toFixed(2), currency: "USD" },
        sender: { accountName: payFrom },
        recipient: { name: recipientName },
        note: note || undefined,
      });
    } catch (e: any) {
      setOtpError(e?.message || "Could not confirm code.");
    } finally {
      setOtpLoading(false);
    }
  }

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={isHydrated ? userName : "User"} />
      <section className="pt-[120px] container-x pb-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-3">Send to PayPal</h1>

          {errorText && (
            <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorText}
            </div>
          )}

          <div className="rounded-2xl border border-white/20 bg-white/[0.03] p-5 space-y-4">
            {/* Recipient */}
            <label className="text-sm text-white/70">Recipient (email / phone / PayPal username)</label>
            <div className="flex gap-2">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1 rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
                placeholder="recipient@example.com • +1 555-555-5555 • paypal.me/you"
              />
              <div className="grid place-items-center px-3">
                <Mail className="opacity-70" />
              </div>
            </div>

            {/* Amount */}
            <label className="text-sm text-white/70">Amount (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setAmount((v) => blurMoney(v))}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 text-lg"
              placeholder="0.00"
            />

            {/* Note */}
            <label className="text-sm text-white/70">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
              placeholder="For dinner"
            />

            {/* Pay From */}
            <label className="text-sm text-white/70">Pay from</label>
            <select
              value={payFrom}
              onChange={(e) => setPayFrom(e.target.value as AccountKind)}
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3"
            >
              <option value="Checking">Checking — {fmt(isHydrated ? checking : 0)}</option>
              <option value="Savings">Savings — {fmt(isHydrated ? savings : 0)}</option>
            </select>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSend}
                disabled={loading || !canSubmit}
                className="px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] disabled:opacity-60"
                style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {loading ? "Submitting…" : `Send ${fmt(amt)} via PayPal`}
              </button>
              <button
                onClick={() => router.push("/Transfer")}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20"
              >
                Cancel
              </button>
            </div>

            {/* Inline OTP (accordion) */}
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
