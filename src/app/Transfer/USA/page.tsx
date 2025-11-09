// app/dashboard/transfers/usa/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  DollarSign,
  Landmark,
  Lock,
  Mail,
  NotebookPen,
  Shield,
  User,
  Building2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import API, { afterCreateTransfer } from "@/libs/api";

/* -----------------------------------------------------------------------------
   USA Transfer • Page
   Route: /dashboard/transfers/usa
   - ACH / Same-day ACH / Wire (domestic)
   - Hydration-safe real balances via API.me(), with localStorage fallback
   - OTP-gated flow (create -> OTP_REQUIRED -> confirm -> route to Pending)
----------------------------------------------------------------------------- */

type AccountType = "Checking" | "Savings";
type Delivery = "ACH" | "SAME_DAY_ACH" | "WIRE";

// 🔒 Use the API function's own parameter type to type our payload
type UsaPayload = Parameters<typeof API.createUsaTransfer>[0];

export default function USATransferPage() {
  const router = useRouter();

  /* --------------------------- Hydration-safety --------------------------- */
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const [todayISO, setTodayISO] = useState("");
  useEffect(() => setTodayISO(new Date().toISOString().slice(0, 10)), []);

  /* ----------------------- User + dashboard balances ---------------------- */
  const [userName, setUserName] = useState("User");
  const [checkingBalance, setCheckingBalance] = useState<number>(0);
  const [savingsBalance, setSavingsBalance] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await API.me(); // {user: {...}} or {...}
        if (cancelled) return;
        const u: any = (me as any)?.user ?? me;

        const fullName =
          [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
          u?.fullName ||
          u?.handle ||
          "User";
        setUserName(fullName);

        setCheckingBalance(Number(u?.balances?.checking ?? 0));
        setSavingsBalance(Number(u?.balances?.savings ?? 0));
      } catch {
        // Fallback to localStorage if API fails
        const localName = localStorage.getItem("hb_user_name");
        if (localName) setUserName(localName);
        setCheckingBalance(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
        setSavingsBalance(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------ Core state ------------------------------ */
  const [fromAccount, setFromAccount] = useState<AccountType>("Checking");
  useEffect(() => {
    if (!isHydrated) return;
    setFromAccount((checkingBalance ?? 0) >= (savingsBalance ?? 0) ? "Checking" : "Savings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, checkingBalance, savingsBalance]);

  const [recipientType, setRecipientType] = useState<"Individual" | "Business">("Individual");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");

  const [accountNumber, setAccountNumber] = useState("");
  const [accountNumber2, setAccountNumber2] = useState("");
  const [recipientAcctType, setRecipientAcctType] = useState<AccountType>("Checking");
  const [routingNumber, setRoutingNumber] = useState("");

  const [amount, setAmount] = useState<string>("");
  const [delivery, setDelivery] = useState<Delivery>("ACH");
  const [schedule, setSchedule] = useState<"NOW" | "FUTURE">("NOW");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [memo, setMemo] = useState("");

  const [saveRecipient, setSaveRecipient] = useState(true);
  const [emailNotify, setEmailNotify] = useState(true);
  const [agree, setAgree] = useState(false);

  // UI
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // OTP
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpRef, setOtpRef] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  /* ----------------------------- Derived values ---------------------------- */
  const availableBalance = fromAccount === "Checking" ? checkingBalance : savingsBalance;

  const parsedAmount = useMemo(() => {
    const a = Number(String(amount).replace(/[,$\s]/g, ""));
    return isFinite(a) ? a : 0;
  }, [amount]);

  // Local, user-visible fee estimate (final fees authoritative from backend)
  const fee = useMemo(() => {
    if (delivery === "WIRE") return 18;
    if (delivery === "SAME_DAY_ACH") return 2.5;
    return 0;
  }, [delivery]);

  const eta = useMemo(() => {
    if (delivery === "WIRE") return "Same business day (cutoff dependent)";
    if (delivery === "SAME_DAY_ACH") return "Same day (ACH cutoff dependent)";
    return "1–3 business days (ACH)";
  }, [delivery]);

  const totalDebit = parsedAmount + fee;

  /* ---------------------------- Validation helpers --------------------------- */
  const routingValid = /^\d{9}$/.test(routingNumber);
  const acctMatch = accountNumber.length >= 4 && accountNumber === accountNumber2;
  const amountValid = parsedAmount > 0 && totalDebit <= availableBalance;
  const nameValid = recipientName.trim().length >= 2;
  const bankValid = bankName.trim().length >= 2;
  const scheduleValid =
    schedule === "NOW" || (schedule === "FUTURE" && !!todayISO && scheduleDate >= todayISO);

  const canReview =
    routingValid &&
    acctMatch &&
    amountValid &&
    nameValid &&
    bankValid &&
    scheduleValid &&
    agree;

  /* -------------------------------- Helpers -------------------------------- */
  function formatMoney(v: number) {
    try {
      return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
    } catch {
      return `$${(v || 0).toFixed(2)}`;
    }
  }
  function maskAcct(acct: string) {
    const end = acct.slice(-4);
    return "•••• " + end;
  }
  function deliveryLabel(d: Delivery) {
    if (d === "WIRE") return "Wire (domestic)";
    if (d === "SAME_DAY_ACH") return "Same-day ACH";
    return "Standard ACH";
  }
  function railForDelivery(d: Delivery) {
    if (d === "WIRE") return "wire_domestic";
    if (d === "SAME_DAY_ACH") return "ach_same_day";
    return "ach";
  }
  function openReview(e: React.FormEvent) {
    e.preventDefault();
    if (!canReview) return;
    setShowReview(true);
  }

  /* -------------------------------- Submit flow ------------------------------- */
  async function submitTransfer() {
    if (!canReview || submitting) return;
    setSubmitting(true);
    setOtpError(null);

    // Build normalized backend payload (matches lib/api.ts createUsaTransfer)
    const payload: UsaPayload = {
      fromAccount,
      delivery, // "ACH" | "SAME_DAY_ACH" | "WIRE"
      amount: +parsedAmount.toFixed(2),
      recipientType, // "Individual" | "Business"
      recipientName,
      recipientEmail: recipientEmail || undefined,
      bankName,
      bankAddress: bankAddress || undefined,
      routing: routingNumber,
      account: accountNumber,
      recipientAcctType: recipientAcctType === "Checking" ? "Checking" : "Savings",
      schedule: { mode: schedule, date: schedule === "FUTURE" ? scheduleDate : null },
      memo: memo || undefined,

      // optional hints; your backend can ignore these safely
      saveRecipient,
      emailNotify,
    };

    try {
      // Backend should:
      // - place auth-hold if NOW
      // - write ledger (pending)
      // - enqueue admin review
      // - issue OTP => return { referenceId, status: "OTP_REQUIRED", otpDevHint? }
      const res: any = await API.createUsaTransfer(payload);

      const ref =
        res?.referenceId ||
        res?.ref ||
        ("US-" + Math.random().toString(36).slice(2, 10).toUpperCase());

      const requiresOtp =
        res?.status === "OTP_REQUIRED" || res?.requiresOtp === true || true;

      if (ref && requiresOtp) {
        setOtpRef(ref);
        setOtpOpen(true);
        if ((res as any)?.otpDevHint) {
          console.log("[DEV] OTP hint:", (res as any).otpDevHint);
        }
        // DO NOT route yet. Only route after OTP success.
        return;
      }

      // Extremely unlikely in this flow; guard just in case:
      alert("Unexpected: transfer did not require OTP. Pending view remains gated by OTP.");
    } catch (err: any) {
      alert(err?.message || "Could not submit transfer. Please try again.");
    } finally {
      setSubmitting(false);
      setShowReview(false);
    }
  }

  /* ------------------------------- OTP handlers ------------------------------ */
  async function verifyOtpNow() {
    if (!otpRef || !otpCode || submitting) return;
    setSubmitting(true);
    setOtpError(null);
    try {
      await API.verifyTransferOtp(otpRef, otpCode);

      // Only AFTER successful OTP: handoff + route to Pending
      const rail = railForDelivery(delivery);
      afterCreateTransfer(router, {
        referenceId: otpRef,
        status: "PENDING_ADMIN",
        rail,
        amount: { value: +parsedAmount.toFixed(2), currency: "USD" },
        eta: eta,
        sender: { accountName: fromAccount },
        recipient: {
          name: recipientName,
          accountMasked: maskAcct(accountNumber),
        },
        fees: { app: typeof fee === "number" ? +fee.toFixed(2) : 0, currency: "USD" },
        note: memo || undefined,
      });
    } catch (e: any) {
      setOtpError(e?.message || "Invalid code. Try again.");
    } finally {
      setSubmitting(false);
      setOtpOpen(false);
      setOtpCode("");
    }
  }

  /* -------------------------------- RENDER ---------------------------------- */
  const availableText = isHydrated ? formatMoney(availableBalance) : "—";

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={isHydrated ? userName : "—"} />

      <section className="pt-[100px] container-x pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <a
              href="/dashboard/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition"
            >
              <ArrowLeft className="h-5 w-5" /> Back to dashboard
            </a>
          </div>

          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">USA Transfer</h1>
                <p className="text-white/70 mt-1">Send to U.S. bank accounts (ACH / Same-day ACH / Wire).</p>
              </div>
              <div className="hidden sm:block text-sm text-white/70">
                Available {fromAccount}:{" "}
                <span className="text-white font-semibold">{availableText}</span>
              </div>
            </div>

            {/* Form */}
            <form className="mt-6 grid gap-6" onSubmit={openReview}>
              {/* From + Amount */}
              <div className="grid md:grid-cols-3 gap-5">
                <LabeledSelect
                  label="From account"
                  value={fromAccount}
                  onChange={(v) => setFromAccount(v as AccountType)}
                  options={[
                    { value: "Checking", label: `Checking — ${isHydrated ? formatMoney(checkingBalance) : "—"}` },
                    { value: "Savings", label: `Savings — ${isHydrated ? formatMoney(savingsBalance) : "—"}` },
                  ]}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <LabeledMoney
                  label="Amount (USD)"
                  value={amount}
                  onChange={setAmount}
                  icon={<DollarSign className="h-4 w-4" />}
                  hint={`Fee: ${formatMoney(fee)} • Total debit: ${isHydrated ? formatMoney(totalDebit) : "—"}`}
                  invalidMsg={
                    !amount
                      ? undefined
                      : parsedAmount <= 0
                      ? "Enter a valid amount."
                      : isHydrated && totalDebit > availableBalance
                      ? "Insufficient funds in selected account."
                      : undefined
                  }
                />
                <LabeledSelect
                  label="Delivery speed"
                  value={delivery}
                  onChange={(v) => setDelivery(v as Delivery)}
                  options={[
                    { value: "ACH", label: "Standard ACH (1–3 biz days) — $0.00" },
                    { value: "SAME_DAY_ACH", label: "Same-day ACH — $2.50" },
                    { value: "WIRE", label: "Wire (domestic) — $18.00" },
                  ]}
                  icon={<Landmark className="h-4 w-4" />}
                  subText={eta}
                />
              </div>

              {/* Recipient basics */}
              <div className="grid md:grid-cols-3 gap-5">
                <LabeledSelect
                  label="Recipient type"
                  value={recipientType}
                  onChange={(v) => setRecipientType(v as any)}
                  options={[
                    { value: "Individual", label: "Individual" },
                    { value: "Business", label: "Business" },
                  ]}
                  icon={<User className="h-4 w-4" />}
                />
                <LabeledInput
                  label="Recipient full name / business name"
                  value={recipientName}
                  onChange={setRecipientName}
                  icon={<User className="h-4 w-4" />}
                  invalidMsg={recipientName && recipientName.trim().length < 2 ? "Enter a valid name." : undefined}
                />
                <LabeledInput
                  label="Recipient email (optional, for receipt)"
                  value={recipientEmail}
                  onChange={setRecipientEmail}
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>

              {/* Bank details */}
              <div className="grid md:grid-cols-2 gap-5">
                <LabeledInput
                  label="Bank name"
                  value={bankName}
                  onChange={setBankName}
                  icon={<Landmark className="h-4 w-4" />}
                  invalidMsg={bankName && bankName.trim().length < 2 ? "Enter a valid bank name." : undefined}
                />
                <LabeledInput
                  label="Bank address (optional)"
                  value={bankAddress}
                  onChange={setBankAddress}
                  icon={<NotebookPen className="h-4 w-4" />}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <LabeledInput
                  label="Routing number (ABA — 9 digits)"
                  value={routingNumber}
                  onChange={(v) => setRoutingNumber(v.replace(/\D/g, "").slice(0, 9))}
                  maxLength={9}
                  icon={<Shield className="h-4 w-4" />}
                  invalidMsg={routingNumber && !routingValid ? "Routing must be exactly 9 digits." : undefined}
                />
                <LabeledInput
                  label="Account number"
                  value={accountNumber}
                  onChange={(v) => setAccountNumber(v.replace(/\s/g, ""))}
                  icon={<Lock className="h-4 w-4" />}
                />
                <LabeledInput
                  label="Confirm account number"
                  value={accountNumber2}
                  onChange={(v) => setAccountNumber2(v.replace(/\s/g, ""))}
                  icon={<Lock className="h-4 w-4" />}
                  invalidMsg={accountNumber2 && !acctMatch ? "Account numbers must match." : undefined}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <LabeledSelect
                  label="Recipient account type"
                  value={recipientAcctType}
                  onChange={(v) => setRecipientAcctType(v as AccountType)}
                  options={[
                    { value: "Checking", label: "Checking" },
                    { value: "Savings", label: "Savings" },
                  ]}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <LabeledSelect
                  label="Schedule"
                  value={schedule}
                  onChange={(v) => setSchedule(v as any)}
                  options={[
                    { value: "NOW", label: "Send now" },
                    { value: "FUTURE", label: "Schedule for later" },
                  ]}
                  icon={<CalendarIcon className="h-4 w-4" />}
                />
                <LabeledInput
                  label="Scheduled date"
                  type="date"
                  value={scheduleDate}
                  onChange={setScheduleDate}
                  disabled={schedule !== "FUTURE"}
                  min={isHydrated ? todayISO : undefined}
                  icon={<CalendarIcon className="h-4 w-4" />}
                  invalidMsg={
                    schedule === "FUTURE" && scheduleDate && isHydrated && todayISO && scheduleDate < todayISO
                      ? "Pick a future date."
                      : undefined
                  }
                />
              </div>

              <LabeledTextArea
                label="Memo / note (optional)"
                value={memo}
                onChange={setMemo}
                placeholder="Payment for invoice #1287"
              />

              {/* Toggles */}
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-md accent-cyan-400"
                    checked={saveRecipient}
                    onChange={(e) => setSaveRecipient(e.target.checked)}
                  />
                  Save recipient to address book
                </label>
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-md accent-cyan-400"
                    checked={emailNotify}
                    onChange={(e) => setEmailNotify(e.target.checked)}
                  />
                  Email me a receipt
                </label>
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-md accent-cyan-400"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  I agree to the transfer terms and fees
                </label>
              </div>

              {/* Footer actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="text-sm text-white/70">
                  Fee: <span className="text-white">{formatMoney(fee)}</span> • Total debit:{" "}
                  <span className="text-white">{isHydrated ? formatMoney(totalDebit) : "—"}</span> • ETA: {eta}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="/dashboard/dashboard"
                    className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition"
                  >
                    Cancel
                  </a>
                  <button
                    type="submit"
                    disabled={!canReview || !isHydrated}
                    className={`px-5 py-3 rounded-2xl transition shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                      canReview && isHydrated ? "text-[#0B0F14]" : "opacity-60 cursor-not-allowed text-[#0B0F14]"
                    }`}
                    style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                  >
                    Review & Send
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Review modal */}
      <Sheet open={showReview} onClose={() => setShowReview(false)} title="Review transfer">
        <div className="space-y-4">
          <ReviewRow k="From" v={`${fromAccount} — ${isHydrated ? formatMoney(availableBalance) : "—"}`} />
          <ReviewRow k="To" v={`${recipientName} (${recipientType})`} />
          <ReviewRow k="Bank" v={`${bankName}${bankAddress ? " — " + bankAddress : ""}`} />
          <ReviewRow k="Routing" v={routingNumber} />
          <ReviewRow k="Account" v={`${maskAcct(accountNumber)} (${recipientAcctType})`} />
          <ReviewRow k="Delivery" v={`${deliveryLabel(delivery)} • ${eta}`} />
          <ReviewRow k="Schedule" v={schedule === "NOW" ? "Send now" : `Scheduled — ${scheduleDate || "—"}`} />
          {memo && <ReviewRow k="Memo" v={memo} />}
          <div className="h-px bg-white/20 my-3" />
          <div className="flex items-center justify-between text-base">
            <div>Total</div>
            <div className="font-semibold">{isHydrated ? formatMoney(totalDebit) : "—"}</div>
          </div>
          <div className="text-sm text-white/70">Includes fee of {formatMoney(fee)}.</div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition"
              onClick={() => setShowReview(false)}
            >
              Edit details
            </button>
            <button
              onClick={submitTransfer}
              disabled={submitting || !isHydrated}
              className="px-5 py-3 rounded-2xl text-[#0B0F14] transition shadow-[0_12px_32px_rgba(0,180,216,.35)]"
              style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
            >
              {submitting ? "Submitting…" : "Confirm & Send"}
            </button>
          </div>
        </div>
      </Sheet>

      {/* OTP Sheet (only path to Pending) */}
      <OtpSheet
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onSubmit={verifyOtpNow}
        code={otpCode}
        setCode={setOtpCode}
        error={otpError}
      />
    </main>
  );
}

/* --------------------------------- UI Bits --------------------------------- */

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  invalidMsg,
  disabled,
  min,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  invalidMsg?: string;
  disabled?: boolean;
  min?: string;
  maxLength?: number;
}) {
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
        <input
          type={type}
          value={value}
          disabled={disabled}
          min={min}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-2xl bg-white/10 border ${invalidMsg ? "border-rose-400/60" : "border-white/20"} ${
            icon ? "pl-11" : "pl-4"
          } pr-4 py-3 text-base shadow-inner`}
        />
      </div>
      {invalidMsg && <span className="text-xs text-rose-300">{invalidMsg}</span>}
    </label>
  );
}

function LabeledTextArea({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-4 opacity-80">{icon}</div>}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`w/full rounded-2xl bg-white/10 border border-white/20 ${icon ? "pl-11" : "pl-4"} pr-4 py-3 text-base shadow-inner`.replace(
            "/",
            ""
          )}
        />
      </div>
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  icon,
  subText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
  subText?: string;
}) {
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl bg-white/10 border border-white/20 ${icon ? "pl-10" : "pl-3"} pr-4 py-3 text-base shadow-inner`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {subText && <span className="text-xs text-white/60">{subText}</span>}
    </label>
  );
}

function LabeledMoney({
  label,
  value,
  onChange,
  icon,
  hint,
  invalidMsg,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  hint?: string;
  invalidMsg?: string;
}) {
  function blurFormat(v: string) {
    const n = Number(v.replace(/[,$\s]/g, ""));
    if (!isFinite(n) || n === 0) return v.trim();
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
        <input
          inputMode="decimal"
          value={value}
          onBlur={() => onChange(blurFormat(value))}
          onChange={(e) => onChange(e.target.value)}
          placeholder="$0.00"
          className={`w-full rounded-2xl bg-white/10 border ${invalidMsg ? "border-rose-400/60" : "border-white/20"} ${
            icon ? "pl-11" : "pl-4"
          } pr-4 py-3 text-base shadow-inner`}
        />
      </div>
      {invalidMsg ? (
        <span className="text-xs text-rose-300">{invalidMsg}</span>
      ) : (
        hint && <span className="text-xs text-white/60">{hint}</span>
      )}
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

/* ------------------------------- SHEET (reused) ------------------------------ */
function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
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
            className="h-10 w-10 rounded-2xl hover:bg-white/15 grid place-items-center transition-all"
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

/* -------------------------------- OTP SHEET -------------------------------- */
function OtpSheet({
  open,
  onClose,
  onSubmit,
  code,
  setCode,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  code: string;
  setCode: (v: string) => void;
  error: string | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-[#0F1622] border-l border-white/20 shadow-[0_12px_48px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/20">
          <h3 className="text-base font-semibold">Enter OTP to continue</h3>
          <button
            aria-label="Close"
            className="h-10 w-10 rounded-2xl hover:bg-white/15 grid place-items-center transition-all"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-white/70 text-sm">
            We’ve sent a one-time passcode to your email. Enter it below to submit your transfer for admin approval.
          </p>
          <div className="relative">
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className={`w-full rounded-2xl bg-white/10 border ${error ? "border-rose-400/60" : "border-white/20"} px-4 py-3 text-base shadow-inner tracking-widest text-center`}
            />
          </div>
          {error && <div className="text-rose-300 text-sm">{error}</div>}
          <div className="flex items-center justify-end gap-3">
            <button className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-5 py-3 rounded-2xl text-[#0B0F14] transition shadow-[0_12px_32px_rgba(0,180,216,.35)]"
              style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              onClick={onSubmit}
              disabled={!code || code.length < 6}
            >
              Verify & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
