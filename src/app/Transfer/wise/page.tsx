// app/dashboard/transfers/wise/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  User,
  Mail,
  Building2,
  Hash,
  DollarSign,
  FileText,
  Shield,
  ChevronDown,
  LockKeyhole,
  Loader2,
} from "lucide-react";
import API, { initiateTransfer } from "@/libs/api";

type AccountKind = "Checking" | "Savings";

export default function WiseSendPage() {
  const router = useRouter();

  /* --------------------------- User + balances (real) --------------------------- */
  const [userName, setUserName] = useState("User");
  const [checking, setChecking] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await API.me(); // { user: {...} }
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
        // Fallback to local cache for dev
        const n = localStorage.getItem("hb_user_name");
        if (n) setUserName(n);
        setChecking(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
        setSavings(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------- Form state --------------------------------- */
  const [payFrom, setPayFrom] = useState<AccountKind>("Checking");
  useEffect(() => {
    // Default from richer balance
    if (!isHydrated) return;
    setPayFrom((checking ?? 0) >= (savings ?? 0) ? "Checking" : "Savings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, checking, savings]);

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [amount, setAmount] = useState("150.00");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Inline OTP
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [transferRef, setTransferRef] = useState<string | null>(null);

  /* --------------------------------- Helpers ---------------------------------- */
  const available = payFrom === "Checking" ? checking : savings;
  const amt = useMemo(() => {
    const n = Number(String(amount).replace(/[,$\s]/g, ""));
    return isFinite(n) ? n : 0;
  }, [amount]);

  const canSubmit =
    recipientName.trim().length >= 2 &&
    amt > 0 &&
    amt <= available;

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  function blurMoney(v: string) {
    const n = Number(String(v).replace(/[,$\s]/g, ""));
    if (!isFinite(n) || n === 0) return v.trim();
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* --------------------------------- Submit ----------------------------------- */
  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErrorText(null);
    setOtpError(null);

    try {
      // Build payload with multiple name aliases so backend validators are happy.
      const payload = {
        rail: "wise",
        kind: "wise_send",
        fromAccount: payFrom,
        amount: +amt.toFixed(2), // number only; currency separate
        currency: "USD",

        recipient: {
          name: recipientName.trim(),          // ✅ primary
          email: recipientEmail || undefined,
          bankName: recipientBank || undefined,
          ibanOrAcct: recipientAccount || undefined,
          accountNumber: recipientAccount || undefined, // alias
        },

        // 🔁 Top-level name aliases too (matches your wire pattern)
        recipientName: recipientName.trim(),
        recipient_name: recipientName.trim(),
        ["Recipient Name"]: recipientName.trim(),

        memo: note || undefined,

        // Surface to admin
        adminQueue: true,
        adminSurface: "wise",
      };

      // Initiate on the generic router (normalizes body, hits /transfer/wise)
      const res: any = await initiateTransfer(payload);

      // Reference handling
      const referenceId =
        res?.referenceId ||
        res?.ref ||
        ("WISE-" + Math.random().toString(36).slice(2, 10).toUpperCase());

      // Stash minimal handoff (do NOT set hb_open_txn yet; only after OTP)
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: res?.status || "OTP_REQUIRED",
            rail: "wise",
            createdAt: res?.createdAt || new Date().toISOString(),
            amount: { value: +amt.toFixed(2), currency: "USD" },
            sender: { accountName: payFrom },
            recipient: { name: recipientName.trim(), email: recipientEmail },
            referenceId,
            note: note || undefined,
          })
        );
      } catch {}

      // Wise flow mirrors PayPal: show inline OTP; only route after verify
      setTransferRef(referenceId);
      setShowOtp(true);

      // (Optional) dev hint logging if backend returns it
      if ((res as any)?.otpDevHint) {
        console.log("[DEV] OTP hint:", (res as any).otpDevHint);
      }
    } catch (e: any) {
      setErrorText(e?.message || "Failed to start transfer.");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------- OTP Confirm ------------------------------- */
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
      // Uses fixed route: POST /api/transfers/:ref/confirm  { otp }
      await API.verifyTransferOtp(transferRef, code);

      // Only now mark an "open txn" and go pending
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

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} />

      <section className="pt-[110px] container-x pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-sm text-white/60">
            <Link href="/Transfer/transfermethod" className="hover:underline">
              Transfer
            </Link>{" "}
            ▸ <span className="text-white/80">Wise</span>
          </div>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="mt-4 rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#00B4D8]/15 border border-[#00B4D8]/40 grid place-items-center text-[#00B4D8] font-semibold">
                  W
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold">Wise Transfer</h1>
                  <p className="text-white/70 text-sm mt-1">Send to international bank accounts via Wise.</p>
                </div>
              </div>
              <div className="hidden sm:block text-sm text-white/70">
                Available {payFrom}:{" "}
                <span className="text-white font-semibold">
                  {fmt(payFrom === "Checking" ? checking : savings)}
                </span>
              </div>
            </div>

            {errorText && (
              <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorText}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Field label="Recipient name" icon={<User size={14} />}>
                <input
                  className="input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Full name"
                />
              </Field>

              <Field label="Recipient email (optional)" icon={<Mail size={14} />}>
                <input
                  className="input"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </Field>

              <Field label="Bank name" icon={<Building2 size={14} />}>
                <input
                  className="input"
                  value={recipientBank}
                  onChange={(e) => setRecipientBank(e.target.value)}
                  placeholder="e.g., Barclays"
                />
              </Field>

              <Field label="Account / IBAN" icon={<Hash size={14} />}>
                <input
                  className="input"
                  value={recipientAccount}
                  onChange={(e) => setRecipientAccount(e.target.value.toUpperCase())}
                  placeholder="IBAN or local account number"
                />
              </Field>

              <Field label="Amount (USD)" icon={<DollarSign size={14} />}>
                <input
                  className="input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => setAmount((v) => blurMoney(v))}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Pay from" icon={<Building2 size={14} />}>
                <select
                  className="input"
                  value={payFrom}
                  onChange={(e) => setPayFrom(e.target.value as AccountKind)}
                >
                  <option value="Checking">Checking — {fmt(checking)}</option>
                  <option value="Savings">Savings — {fmt(savings)}</option>
                </select>
              </Field>

              <Field className="md:col-span-2" label="Note (optional)" icon={<FileText size={14} />}>
                <input
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment reference"
                />
              </Field>
            </div>

            <div className="mt-4 text-xs text-white/60 flex items-center gap-2">
              <Shield size={14} /> One-time passcode required before we submit for admin review.
            </div>

            <button
              className={`btn-primary mt-5 ${!canSubmit || loading ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Submitting…" : `Send ${fmt(amt)} via Wise`}
            </button>

            {/* Inline OTP dropdown (only path to pending) */}
            {transferRef && (
              <div className="mt-5 rounded-2xl border border-white/15 bg-white/5">
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
                    <p className="text-[11px] text-white/50"></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.75rem 0.9rem;
        }
        .btn-primary {
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: 1rem;
          color: #0b0f14;
          background-image: linear-gradient(90deg, #00b4d8, #00e0ff);
          box-shadow: 0 12px 32px rgba(0, 180, 216, 0.35);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
  icon,
  className,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-sm grid gap-2 ${className || ""}`}>
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
            {icon}
          </div>
        )}
        <div className={`${icon ? "pl-9" : ""}`}>{children}</div>
      </div>
    </label>
  );
}
