// app/dashboard/transfers/zelle/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  DollarSign,
  FileText,
  Shield,
  LockKeyhole,
  ChevronDown,
  Loader2,
} from "lucide-react";
import API, { verifyTransferOtp, afterCreateTransfer } from "@/libs/api";

export default function ZellePage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [checkingBalance, setCheckingBalance] = useState<number>(5023.75);

  // form fields
  const [recipientName, setRecipientName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneUS, setPhoneUS] = useState("");
  const [amount, setAmount] = useState("50.00");
  const [note, setNote] = useState("");

  // ui state
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // otp state
  const [transferRef, setTransferRef] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("hb_user_name") || "User");
      setCheckingBalance(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
    }
  }, []);

  const amt = useMemo(
    () => Number(String(amount).replace(/[,$\s]/g, "") || "0"),
    [amount]
  );
  const validEmail = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validPhone = !phoneUS || /^\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}$/.test(phoneUS);

  const canSubmit =
    recipientName.trim().length >= 2 &&
    amt > 0 &&
    (email || phoneUS) &&
    validEmail &&
    validPhone;

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setErrorText(null);
    setOtpError(null);

    try {
      // 🔑 Match backend signature exactly (NO recipient object)
      const payload = {
        fromAccount: "Checking",
        recipientName: recipientName.trim(),
        email: email || undefined,
        phone: phoneUS || undefined,
        amount: +amt.toFixed(2), // backend handles string/number; send number
        note: note || undefined,
      };

      const res: any = await API.createZelle(payload);

      const referenceId =
        res?.referenceId ||
        res?.ref ||
        ("ZEL-" + Math.random().toString(36).slice(2, 10).toUpperCase());

      // Local snapshot so Pending page has something to open instantly
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: res?.status || "OTP_REQUIRED",
            rail: "zelle",
            createdAt: res?.createdAt || new Date().toISOString(),
            etaText: res?.etaText || "Awaiting approval",
            amount: { value: +amt.toFixed(2), currency: "USD" },
            fees: { app: 0, currency: "USD" },
            sender: { accountName: "Checking" },
            recipient: {
              name: recipientName.trim(),
              email: email || undefined,
              phone: phoneUS || undefined,
            },
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
      setErrorText(err?.message || "Transfer could not be initiated. Try again.");
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
      await verifyTransferOtp(transferRef, code);

      // Let pending page auto-open
      try {
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      // Same post-OTP handoff you already use elsewhere
      afterCreateTransfer(router, {
        referenceId: transferRef,
        rail: "zelle",
        status: "PENDING_ADMIN",
        amount: { value: +amt.toFixed(2), currency: "USD" },
        sender: { accountName: "Checking" },
        recipient: {
          name: recipientName.trim(),
          email: email || undefined,
          phone: phoneUS || undefined,
        },
        note: note || undefined,
      });
      // Navigates to /Transfer/pending?ref=...
    } catch (e: any) {
      setOtpError(e?.message || "Could not confirm code.");
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} />

      <section className="pt-[110px] container-x pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-sm text-white/60">
            <Link href="/Transfer/transfermethod" className="hover:underline">
              Transfer
            </Link>{" "}
            ▸ <span className="text-white/80">Zelle</span>
          </div>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {errorText && (
            <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorText}
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#6D1ED4]/15 border border-[#6D1ED4]/40 grid place-items-center text-[#6D1ED4] font-semibold">
                Z
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">Zelle Transfer</h1>
                <p className="text-white/70 text-sm mt-1">
                  Send instantly to U.S. banks via email or mobile.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Field label="Recipient name" icon={<User className="h-4 w-4" />}>
                <input
                  className="input"
                  placeholder="Jane Doe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </Field>

              <Field label="Amount (USD)" icon={<DollarSign className="h-4 w-4" />}>
                <input
                  className="input pl-10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    const n = Number(String(amount).replace(/[,$\s]/g, "")) || 0;
                    setAmount(
                      n.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    );
                  }}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Recipient email (optional)" icon={<Mail className="h-4 w-4" />}>
                <input
                  className={`input ${email && !validEmail ? "ring-1 ring-rose-400/60" : ""}`}
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field label="Recipient U.S. mobile (optional)" icon={<Phone className="h-4 w-4" />}>
                <input
                  className={`input ${phoneUS && !validPhone ? "ring-1 ring-rose-400/60" : ""}`}
                  placeholder="555-555-1212"
                  value={phoneUS}
                  onChange={(e) => setPhoneUS(e.target.value)}
                />
              </Field>

              <Field className="md:col-span-2" label="Note (optional)" icon={<FileText className="h-4 w-4" />}>
                <input
                  className="input"
                  placeholder="e.g., October rent"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-4 text-xs text-white/60 flex items-center gap-2">
              <Shield className="h-4 w-4" /> OTP verification required. Transaction will appear in
              “Pending” until approved.
            </div>

            <button
              className={`btn-primary mt-5 ${!canSubmit || loading ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Submitting…" : `Send ${fmt(amt)} via Zelle`}
            </button>

            {/* OTP block */}
            {transferRef && (
              <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 overflow-hidden">
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
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">{icon}</div>}
        <div className={`${icon ? "pl-9" : ""}`}>{children}</div>
      </div>
    </label>
  );
}
