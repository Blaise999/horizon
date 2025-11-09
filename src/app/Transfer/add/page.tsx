// app/dashboard/money/add/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Landmark,
  AlertTriangle,
  ArrowRight,
  Link2,
  Calendar as CalendarIcon,
  Bolt,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ✅ canonical API helpers (aligned with your libs/api.ts)
//   Make sure libs/api.ts re-exports sendOtp/verifyOtp like:
//   export const sendOtp = API.sendOtp; export const verifyOtp = API.verifyOtp;
import { me, sendOtp, verifyOtp, createDeposit } from "@/libs/api";

/* -----------------------------------------------------------------------------
   Add Money • Queue-based flow (OTP → pending → admin approval)
   - Reads linked ACH from backend profile (user.ach)
   - Review → OTP send (email) → OTP verify → create pending "deposit"
   - Admin approves -> ledger credit + notify user
----------------------------------------------------------------------------- */

type AccountType = "Checking" | "Savings";
type SourceType = "BANK_ACH" | "DEBIT_CARD" | "WIRE";
type Speed = "STANDARD" | "SAME_DAY" | "INSTANT";
type AchStatus = "none" | "verifying" | "pending_verification" | "verified" | "failed";
type OtpStep = "idle" | "sending" | "waiting" | "verifying";

// 🔒 Infer the exact payload type from createDeposit
type DepositPayload = Parameters<typeof createDeposit>[0];

export default function AddMoneyPage() {
  const router = useRouter();

  // Display-only balances (we no longer change them here)
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState<string>(""); // ← for email-based OTP
  const [checkingBalance, setCheckingBalance] = useState(5023.75);
  const [savingsBalance, setSavingsBalance] = useState(8350.2);

  // Form
  const [toAccount, setToAccount] = useState<AccountType>("Checking");
  const [source, setSource] = useState<SourceType>("BANK_ACH");
  const [speed, setSpeed] = useState<Speed>("STANDARD");
  const [amount, setAmount] = useState<string>("");

  // (Optional scheduling UI – informational only in this page)
  const [schedule, setSchedule] = useState<"NOW" | "FUTURE">("NOW");
  const [scheduleDate, setScheduleDate] = useState("");
  const todayISO = new Date().toISOString().slice(0, 10);

  // External bank state (from backend onboarding)
  const [achStatus, setAchStatus] = useState<AchStatus>("none");
  const [achBankName, setAchBankName] = useState<string>("");
  const [achMask, setAchMask] = useState<string>("");
  const [fundingSourceId, setFundingSourceId] = useState<string>(""); // optional/placeholder

  // UI
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // OTP UI
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");

  const amountRef = useRef<HTMLInputElement | null>(null);

  /* ------------------------- Load profile + ACH snapshot --------------------- */
  useEffect(() => {
    (async () => {
      try {
        // `me()` returns { user, accounts, ach, wallets, ... }
        const resp = await me();
        const u = (resp as any)?.user || resp || {};

        // Name / Email
        const fullName =
          u.fullName ||
          [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ") ||
          "User";
        setUserName(fullName);
        if (u.email) setUserEmail(String(u.email));

        // Balances (from unified user)
        const b = u.balances || {};
        if (b.checking != null) setCheckingBalance(Number(b.checking));
        if (b.savings != null) setSavingsBalance(Number(b.savings));

        // Linked ACH (from unified user.ach)
        const ach = u.ach || null;
        if (ach) {
          // ach.status is one of: "none" | "verifying" | "pending_verification" | "verified" | "failed"
          const s: string = String(ach.status || "").toLowerCase();
          let mapped: AchStatus = "none";
          if (s === "verified") mapped = "verified";
          else if (s === "pending_verification" || s === "pending") mapped = "pending_verification";
          else if (s === "verifying") mapped = "verifying";
          else if (s === "failed") mapped = "failed";
          else mapped = "none";

          setAchStatus(mapped);
          setAchBankName(ach.bankName || "External bank");
          // ach.mask already looks like "••••1234"
          setAchMask(ach.mask || "");
          // If you later store an id for bank link, set it here:
          // setFundingSourceId(ach.id || "");
        } else {
          setAchStatus("none");
          setAchBankName("");
          setAchMask("");
          setFundingSourceId("");
        }
      } catch (_e) {
        // Non-fatal fallbacks so page renders
        const displayName = localStorage.getItem("hb_user_name");
        if (displayName) setUserName(displayName);
        setCheckingBalance(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
        setSavingsBalance(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
        const s = (localStorage.getItem("hb_ach_status") as AchStatus) || "none";
        setAchStatus(s);
        setAchBankName(localStorage.getItem("hb_ach_bank_name") || "");
        setAchMask(localStorage.getItem("hb_ach_mask") || "");
      }
    })();
  }, []);

  // If ACH not ready, default to card for convenience
  useEffect(() => {
    if (source === "BANK_ACH" && achStatus !== "verified") {
      setSource("DEBIT_CARD");
      setSpeed("INSTANT");
    }
  }, [achStatus, source]);

  /* --------------------------------- Derived -------------------------------- */
  const parsedAmount = useMemo(() => {
    const a = Number(String(amount).replace(/[^\d.]/g, ""));
    return isFinite(a) ? a : 0;
  }, [amount]);

  // Fee/ETA model (simple)
  const { fee, eta } = useMemo(() => {
    if (source === "DEBIT_CARD") return { fee: Math.max(0.99, parsedAmount * 0.015), eta: "Instant" };
    if (source === "BANK_ACH") {
      if (speed === "SAME_DAY") return { fee: 1.5, eta: "Same-day (ACH cutoff dependent)" };
      return { fee: 0, eta: "1–3 business days (ACH)" };
    }
    return { fee: 0, eta: "Same business day once received (cutoff dependent)" };
  }, [source, speed, parsedAmount]);

  const totalCredit = parsedAmount - (source === "DEBIT_CARD" ? fee : 0);
  const scheduleValid = schedule === "NOW" || (schedule === "FUTURE" && scheduleDate >= todayISO);
  const canSubmit = parsedAmount > 0 && scheduleValid;

  const linkedBankLabel =
    achStatus === "verified" && (achBankName || achMask)
      ? `${achBankName || "External bank"} ${achMask || ""}`.trim()
      : achBankName || achMask
      ? `${achBankName || "External bank"} ${achMask || ""}`.trim()
      : "No linked bank";

  function formatMoney(n: number) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function openReview(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setShowReview(true);
  }

  // Return the *exact* rail union that DepositPayload expects
  function methodForRailTyped(): NonNullable<DepositPayload["rail"]> {
    if (source === "DEBIT_CARD") return "card_instant";
    if (source === "BANK_ACH") return speed === "SAME_DAY" ? "ach_same_day" : "ach_standard";
    return "wire_deposit";
  }

  /* -------------------- OTP + Create: pending queue item -------------------- */
  // Triggered from Review sheet: first send OTP and open OTP sheet
  async function submitAdd() {
    try {
      if (!userEmail) throw new Error("Missing user email for OTP.");
      setOtpOpen(true);
      setOtpStep("sending");
      await sendOtp(userEmail); // body: { email }
      setOtpStep("waiting");
    } catch (e: any) {
      setOtpOpen(false);
      alert(e?.message || "Could not start OTP. Try again.");
    }
  }

  // After user enters OTP: verify + create pending deposit
  async function confirmOtpAndCreate() {
    try {
      if (!userEmail) throw new Error("Missing user email.");
      if (!/^\d{4,6}$/.test(otp)) throw new Error("Enter the code we sent.");

      setOtpStep("verifying");
      const v = await verifyOtp(userEmail, otp); // body: { email, code }
      if (!(v?.ok || (v as any)?.emailVerified === true)) {
        throw new Error((v as any)?.error || "Invalid OTP");
      }

      setSubmitting(true);
      const clientRef = "ADD-" + Math.random().toString(36).slice(2, 8).toUpperCase();

      // Build an EXACTLY typed payload
      const payload: DepositPayload = {
        rail: methodForRailTyped(),                                          // "ach_standard" | "ach_same_day" | "card_instant" | "wire_deposit"
        toAccount: toAccount.toLowerCase() as "checking" | "savings",
        amount: +totalCredit.toFixed(2),
        meta: {
          gross: +parsedAmount.toFixed(2),
          fee: +fee.toFixed(2),
          schedule: schedule === "FUTURE" ? scheduleDate : null,
          eta,
          // ACH hint (optional to your server; safe to include when using ACH)
          fundingSourceId: source === "BANK_ACH" ? (fundingSourceId || undefined) : undefined,
          sourcePretty:
            source === "BANK_ACH" ? linkedBankLabel : source === "DEBIT_CARD" ? "Debit Card" : "Wire",
          clientRef,
        },
      };

      const res = await createDeposit(payload);
      const refId = (res as any)?.id || (res as any)?.referenceId || clientRef;

      setSubmittedRef(refId);
      setOtpOpen(false);
      setShowReview(false);

      router.push(`/Transfer/pending?ref=${encodeURIComponent(refId)}`);
    } catch (e: any) {
      alert(e?.message || "Failed. Try again.");
    } finally {
      setSubmitting(false);
      setOtpStep("idle");
    }
  }

  /* --------------------------------- UI bits -------------------------------- */
  function chooseACH() {
    setSource("BANK_ACH");
    if (achStatus === "verified") setSpeed("STANDARD");
    requestAnimationFrame(() => amountRef.current?.focus());
  }
  function chooseCard() {
    setSource("DEBIT_CARD");
    setSpeed("INSTANT");
    requestAnimationFrame(() => amountRef.current?.focus());
  }
  function chooseWire() {
    setSource("WIRE");
    requestAnimationFrame(() => amountRef.current?.focus());
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} />

      <section className="pt-[100px] container-x pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <a href="/dashboard/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white">
              <ArrowLeft className="h-5 w-5" /> Back to dashboard
            </a>
          </div>

          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <h1 className="text-xl md:text-2xl font-semibold">Add money</h1>
            <p className="text-white/70 mt-1">Pick where it comes from, enter an amount, and confirm.</p>

            {/* Quick actions */}
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={chooseACH}
                className="w-full rounded-2xl border px-4 py-3 text-left inline-flex items-center gap-3 bg-white/[0.06] border-white/20 hover:bg-white/[0.08]"
                title={achStatus === "verified" ? `Use ${linkedBankLabel}` : "Finish linking in Onboarding → Wallets"}
              >
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 grid place-items-center">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Add from External ACH</div>
                  <div className="text-xs text-white/70 truncate max-w-[200px]">
                    {achStatus === "verified" ? linkedBankLabel : "No linked bank"}
                  </div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 opacity-80" />
              </button>

              <button
                type="button"
                onClick={chooseCard}
                className="w-full rounded-2xl border px-4 py-3 text-left inline-flex items-center gap-3 bg-white/[0.06] border-white/20 hover:bg-white/[0.08]"
              >
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 grid place-items-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Add instantly with card</div>
                  <div className="text-xs text-white/70">Fee applies</div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 opacity-80" />
              </button>

              <button
                type="button"
                onClick={chooseWire}
                className="w-full rounded-2xl border px-4 py-3 text-left inline-flex items-center gap-3 bg-white/[0.06] border-white/20 hover:bg-white/[0.08]"
              >
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 grid place-items-center">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Wire deposit</div>
                  <div className="text-xs text-white/70">Same day if before cutoff</div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 opacity-80" />
              </button>
            </div>

            {/* 🔗 Linked ACH from Onboarding (read-only panel) */}
            <div className="mt-4 rounded-2xl border border-white/20 bg-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 grid place-items-center shrink-0">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">Linked bank (ACH)</div>
                    {achStatus === "verified" ? (
                      <span className="text-xs text-emerald-300">verified</span>
                    ) : achStatus === "pending_verification" || achStatus === "verifying" ? (
                      <span className="text-xs text-amber-300">pending verification</span>
                    ) : achStatus === "failed" ? (
                      <span className="text-xs text-rose-300">failed</span>
                    ) : (
                      <span className="text-xs text-white/60">none</span>
                    )}
                  </div>
                  <div className="text-sm text-white/80 mt-1">
                    {achStatus === "none"
                      ? "You don’t have an ACH bank linked. Link a bank in Onboarding to use ACH deposits."
                      : `${achBankName || "External bank"} ${achMask || ""}`.trim()}
                  </div>
                  <div className="text-xs text-white/60 mt-2">
                    Manage your bank link in{" "}
                    <a className="underline hover:text-white" href="/onboarding">
                      Onboarding
                    </a>
                    {fundingSourceId ? (
                      <>
                        {" "}
                        • ID: <span className="font-mono">{fundingSourceId}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* ACH readiness banner */}
            {achStatus !== "verified" && (
              <div className="mt-4 mb-2 rounded-2xl border border-white/20 bg-white/[0.04] p-4 text-sm flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-200">External bank not fully linked</div>
                  <div className="text-white/80 mt-1">
                    You can still add via debit card or wire. To use ACH, finish linking your bank in{" "}
                    <a className="underline hover:text-white" href="/onboarding">
                      Onboarding
                    </a>{" "}
                    (Wallets step).
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form className="mt-6 grid gap-6" onSubmit={openReview}>
              <div className="grid md:grid-cols-3 gap-5">
                <FieldSelect
                  label="Deposit to"
                  value={toAccount}
                  onChange={(v) => setToAccount(v as AccountType)}
                  options={[
                    { value: "Checking", label: `Checking — ${formatMoney(checkingBalance)}` },
                    { value: "Savings", label: `Savings — ${formatMoney(savingsBalance)}` },
                  ]}
                  icon={<Building2 className="h-4 w-4" />}
                />

                <FieldSelect
                  label="Source"
                  value={source}
                  onChange={(v) => setSource(v as SourceType)}
                  options={[
                    { value: "BANK_ACH", label: "External bank (ACH)" },
                    { value: "DEBIT_CARD", label: "Debit card (instant)" },
                    { value: "WIRE", label: "Wire deposit" },
                  ]}
                  icon={<Landmark className="h-4 w-4" />}
                />

                <FieldMoney
                  label="Amount (USD)"
                  value={amount}
                  onChange={setAmount}
                  icon={<DollarSign className="h-4 w-4" />}
                  inputRef={amountRef}
                />
              </div>

              {/* Optional: speed/schedule (informational for now) */}
              {source !== "WIRE" && (
                <div className="grid md:grid-cols-3 gap-5">
                  <FieldSelect
                    label="Speed"
                    value={source === "DEBIT_CARD" ? "INSTANT" : speed}
                    onChange={(v) => setSpeed(v as Speed)}
                    options={
                      source === "DEBIT_CARD"
                        ? [{ value: "INSTANT", label: "Instant (card)" }]
                        : [
                            { value: "STANDARD", label: "Standard ACH (1–3 biz days)" },
                            { value: "SAME_DAY", label: "Same-day ACH" },
                          ]
                    }
                    disabled={source === "DEBIT_CARD" || (source === "BANK_ACH" && achStatus !== "verified")}
                    icon={<Bolt className="h-4 w-4" />}
                  />

                  <FieldSelect
                    label="Schedule"
                    value={schedule}
                    onChange={(v) => setSchedule(v as any)}
                    options={[
                      { value: "NOW", label: "Add now" },
                      { value: "FUTURE", label: "Schedule for later" },
                    ]}
                    icon={<CalendarIcon className="h-4 w-4" />}
                  />

                  <FieldInput
                    label="Scheduled date"
                    type="date"
                    value={scheduleDate}
                    onChange={setScheduleDate}
                    disabled={schedule !== "FUTURE"}
                    min={todayISO}
                    icon={<CalendarIcon className="h-4 w-4" />}
                    invalidMsg={
                      schedule === "FUTURE" && scheduleDate && scheduleDate < todayISO ? "Pick a future date." : undefined
                    }
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="text-sm text-white/70">
                  {source === "DEBIT_CARD" ? (
                    <>
                      Card fee: <span className="text-white">{formatMoney(fee)}</span> • You’ll receive{" "}
                      <span className="text-white">{formatMoney(totalCredit)}</span> • ETA: {eta}
                    </>
                  ) : (
                    <>
                      Fee: <span className="text-white">{formatMoney(fee)}</span> • ETA: {eta}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="/dashboard/dashboard"
                    className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15"
                  >
                    Cancel
                  </a>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`px-5 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                      canSubmit ? "" : "opacity-60 cursor-not-allowed"
                    }`}
                    style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                  >
                    Review & Submit
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Pending confirmation */}
          {submittedRef && (
            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <div className="text-amber-200 font-medium">Deposit submitted</div>
                <div className="text-white/80 mt-1">
                  Reference <span className="font-mono">{submittedRef}</span>. Awaiting admin approval.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Review Sheet */}
      <Sheet open={showReview} onClose={() => setShowReview(false)} title="Review deposit">
        <div className="space-y-4 text-sm">
          <ReviewRow k="Deposit to" v={toAccount} />
          <ReviewRow
            k="Source"
            v={
              source === "BANK_ACH"
                ? `External bank (ACH) — ${linkedBankLabel}`
                : source === "DEBIT_CARD"
                ? "Debit card"
                : "Wire deposit"
            }
          />
          <ReviewRow k="Amount" v={formatMoney(parsedAmount)} />
          {source !== "WIRE" && (
            <ReviewRow
              k="Speed"
              v={source === "DEBIT_CARD" ? "Instant" : speed === "SAME_DAY" ? "Same-day ACH" : "Standard ACH"}
            />
          )}
          <ReviewRow k="Schedule" v={schedule === "NOW" ? "Now" : `Scheduled — ${scheduleDate || "—"}`} />
          <div className="h-px bg-white/20 my-2" />
          <div className="flex items-center justify-between text-base">
            <div>{source === "DEBIT_CARD" ? "You will receive" : "Amount to be credited"}</div>
            <div className="font-semibold">
              {source === "DEBIT_CARD" ? formatMoney(totalCredit) : formatMoney(parsedAmount)}
            </div>
          </div>
          <div className="text-xs text-white/60">Includes fee {formatMoney(fee)}. ETA: {eta}.</div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15"
              onClick={() => setShowReview(false)}
            >
              Edit
            </button>
            <button
              onClick={submitAdd} // 🔐 send OTP → open OTP sheet
              disabled={submitting}
              className="px-5 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)]"
              style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
            >
              {submitting ? "Submitting…" : "Confirm & Submit"}
            </button>
          </div>
        </div>
      </Sheet>

      {/* OTP Sheet */}
      <OtpSheet
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        step={otpStep}
        otp={otp}
        setOtp={setOtp}
        onConfirm={confirmOtpAndCreate}
      />
    </main>
  );
}

/* ----------------------------- Small shared bits ---------------------------- */

function FieldInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  disabled?: boolean;
  invalidMsg?: string;
  min?: string;
}) {
  const { label, value, onChange, placeholder, type = "text", icon, disabled, invalidMsg, min } = props;
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          className={`w-full rounded-2xl bg-white/10 border ${
            invalidMsg ? "border-rose-400/60" : "border-white/20"
          } ${icon ? "pl-11" : "pl-4"} pr-4 py-3 text-base shadow-inner`}
        />
      </div>
      {invalidMsg && <span className="text-xs text-rose-300">{invalidMsg}</span>}
    </label>
  );
}

function FieldMoney(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: ReactNode;
  invalidMsg?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const { label, value, onChange, icon, invalidMsg, inputRef } = props;
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
        <input
          ref={inputRef}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const n = Number(String(value).replace(/[^\d.]/g, ""));
            if (isFinite(n))
              onChange(n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          }}
          placeholder="0.00"
          className={`w-full rounded-2xl bg-white/10 border ${
            invalidMsg ? "border-rose-400/60" : "border-white/20"
          } ${icon ? "pl-11" : "pl-4"} pr-4 py-3 text-base shadow-inner`}
        />
      </div>
      {invalidMsg && <span className="text-xs text-rose-300">{invalidMsg}</span>}
    </label>
  );
}

function FieldSelect(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const { label, value, onChange, options, icon, disabled } = props;
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full rounded-2xl bg-white/10 border border-white/20 ${icon ? "pl-10" : "pl-3"} pr-4 py-3 text-base shadow-inner`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/[0.04] px-4 py-3">
      <div className="text-sm text-white/70">{k}</div>
      <div className="text-sm font-medium">{v}</div>
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
            className="h-10 w-10 rounded-2xl hover:bg-white/15 grid place-items-center"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100%-64px)]">{children}</div>
      </div>
    </div>
  );
}

function OtpSheet({
  open,
  onClose,
  step,
  otp,
  setOtp,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  step: OtpStep;
  otp: string;
  setOtp: (v: string) => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const busy = step === "sending" || step === "verifying";
  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-[#0F1622] border-l border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
          <h3 className="font-semibold">Verify with OTP</h3>
          <button className="h-10 w-10 rounded-2xl hover:bg-white/15" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-6 grid gap-4">
          {step === "sending" && <div className="text-sm text-white/70">Sending code…</div>}
          {step !== "sending" && (
            <>
              <label className="text-sm grid gap-2">
                <span className="text-white/70">Enter the 6-digit code</span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3"
                />
              </label>
              <button
                disabled={busy || otp.length < 4}
                onClick={onConfirm}
                className="px-5 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)]"
                style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {step === "verifying" ? "Verifying…" : "Confirm"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
