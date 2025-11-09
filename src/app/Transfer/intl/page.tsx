// app/dashboard/transfers/international/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  Globe2,
  Landmark,
  Lock,
  Mail,
  NotebookPen,
  Shield,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createInternational } from "@/libs/api";

/* -----------------------------------------------------------------------------
   International Transfer • Works with backend controller + routes
   Flow (server): debit -> ledger(pending) -> admin_review -> OTP_REQUIRED
   Client (here): submit -> get {referenceId, status: "OTP_REQUIRED"} -> route to
                   /Transfer/pending?ref=...
   After admin approval, your push/notification handler should route to
                   /Transfer/success?ref=...
----------------------------------------------------------------------------- */

type AccountType = "Checking" | "Savings";
type FeePayer = "OUR" | "SHA" | "BEN";
type Currency =
  | "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "CHF" | "NGN" | "ZAR" | "INR" | "CNY";

export default function InternationalTransferPage() {
  const router = useRouter();

  // Personalization (kept lightweight; server is source of truth)
  const [userName, setUserName] = useState("User");
  const [checkingBalance, setCheckingBalance] = useState<number>(5023.75);
  const [savingsBalance, setSavingsBalance] = useState<number>(8350.2);

  // Source / funding
  const [fromAccount, setFromAccount] = useState<AccountType>("Checking");

  // Amounts / currency
  const [sendCurrency, setSendCurrency] = useState<Currency>("USD"); // Typically USD
  const [recvCurrency, setRecvCurrency] = useState<Currency>("EUR");
  const [amount, setAmount] = useState<string>(""); // in sendCurrency
  const [fxLocked, setFxLocked] = useState(false);

  // Beneficiary
  const [beneficiaryType, setBeneficiaryType] = useState<"Individual" | "Business">("Individual");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");
  const [beneficiaryAddress, setBeneficiaryAddress] = useState("");

  // Beneficiary bank
  const [bankCountry, setBankCountry] = useState("United Kingdom");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [swiftBic, setSwiftBic] = useState(""); // 8 or 11 char
  const [ibanOrAcct, setIbanOrAcct] = useState(""); // IBAN or local acct
  const [purpose, setPurpose] = useState("Goods/Services Payment");

  // Intermediary (optional)
  const [useIntermediary, setUseIntermediary] = useState(false);
  const [interName, setInterName] = useState("");
  const [interSwift, setInterSwift] = useState("");
  const [interAcct, setInterAcct] = useState("");

  // Fees / options
  const [feePayer, setFeePayer] = useState<FeePayer>("SHA");
  const [saveRecipient, setSaveRecipient] = useState(true);   // local-only UX flag
  const [emailNotify, setEmailNotify] = useState(true);       // local-only UX flag

  // Schedule / references
  const [schedule, setSchedule] = useState<"NOW" | "FUTURE">("NOW");
  const [scheduleDate, setScheduleDate] = useState("");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");

  // Compliance confirmations
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [confirmNoSanctions, setConfirmNoSanctions] = useState(false);
  const [confirmNoProhibited, setConfirmNoProhibited] = useState(false);

  // UI
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const n = localStorage.getItem("hb_user_name");
    if (n) setUserName(n);
    setCheckingBalance(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
    setSavingsBalance(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
  }, []);

  const availableBalance = fromAccount === "Checking" ? checkingBalance : savingsBalance;

  /* ------------------------------ FX Estimation ------------------------------ */
  function getFxMid(send: Currency, recv: Currency): number {
    if (send === recv) return 1;
    const table: Record<string, number> = {
      "USD:EUR": 0.92,
      "USD:GBP": 0.77,
      "USD:CAD": 1.34,
      "USD:AUD": 1.53,
      "USD:JPY": 151.2,
      "USD:CHF": 0.85,
      "USD:NGN": 1520,
      "USD:ZAR": 18.4,
      "USD:INR": 83.2,
      "USD:CNY": 7.26,
    };
    const key = `${send}:${recv}`;
    if (table[key]) return table[key];
    if (send !== "USD" && recv !== "USD") {
      const midSendToUSD = 1 / (table[`USD:${send}`] || 1);
      const midUSDToRecv = table[`USD:${recv}`] || 1;
      return midSendToUSD * midUSDToRecv;
    }
    return 1;
  }

  const midRate = useMemo(() => getFxMid(sendCurrency, recvCurrency), [sendCurrency, recvCurrency]);

  // Spread example: 0.6% for majors, 1.5% for others (mock)
  const spreadPct = useMemo(() => {
    const major = new Set<Currency>(["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"]);
    const exotic = !(major.has(sendCurrency) && major.has(recvCurrency));
    return exotic ? 0.015 : 0.006;
  }, [sendCurrency, recvCurrency]);

  const customerRate = useMemo(() => midRate * (1 - spreadPct), [midRate, spreadPct]);

  const parsedAmount = useMemo(() => {
    const a = Number(String(amount).replace(/[^\d.]/g, ""));
    return isFinite(a) ? a : 0;
  }, [amount]);

  const recvEstimate = useMemo(() => parsedAmount * customerRate, [parsedAmount, customerRate]);

  // Fees (match controller defaults; we also pass them down explicitly)
  const bankFee = 35;
  const estNetworkFees = 15; // only charged if payer==OUR
  const totalDebit = parsedAmount + bankFee + (feePayer === "OUR" ? estNetworkFees : 0);

  /* -------------------------------- Validation ------------------------------- */
  const amountValid = parsedAmount > 0 && totalDebit <= availableBalance;
  const nameValid = beneficiaryName.trim().length >= 2;
  const bankValid = bankName.trim().length >= 2;

  const swiftValid = /^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/.test(swiftBic);
  const ibanOrAcctValid = ibanOrAcct.trim().length >= 8;

  const scheduleValid = schedule === "NOW" || (schedule === "FUTURE" && scheduleDate >= todayISO);

  const complianceOk = confirmAccuracy && confirmNoSanctions && confirmNoProhibited;

  const canReview =
    amountValid &&
    nameValid &&
    bankValid &&
    swiftValid &&
    ibanOrAcctValid &&
    scheduleValid &&
    complianceOk;

  /* --------------------------------- Utils ---------------------------------- */
  function formatMoney(v: number, c: Currency = "USD") {
    return v.toLocaleString(undefined, { style: "currency", currency: c });
  }

  // Optimistic local debit so dashboard shows the hold immediately.
  function optimisticDebit(amountUsd: number, from: AccountType) {
    const bal = from === "Checking" ? checkingBalance : savingsBalance;
    const nb = +(bal - amountUsd).toFixed(2);
    if (from === "Checking") {
      setCheckingBalance(nb);
      try { localStorage.setItem("hb_acc_checking_bal", String(nb)); } catch {}
    } else {
      setSavingsBalance(nb);
      try { localStorage.setItem("hb_acc_savings_bal", String(nb)); } catch {}
    }
  }

  /* -------------------------------- Handlers -------------------------------- */
  function openReview(e: React.FormEvent) {
    e.preventDefault();
    if (!canReview) return;
    setShowReview(true);
  }

  async function submitIntl() {
    if (!canReview || submitting) return;
    setSubmitting(true);
    setErrorText(null);

    try {
      // Build payload that matches your controller signature
      const payload = {
        fromAccount,                       // "Checking" | "Savings"
        sendCurrency,                      // e.g. "USD"
        recvCurrency,                      // e.g. "EUR"
        amount: +parsedAmount.toFixed(2),  // send-side amount
        feePayer,                          // "OUR" | "SHA" | "BEN"
        beneficiary: {
          type: beneficiaryType,
          name: beneficiaryName,
          email: beneficiaryEmail || undefined,
          address: beneficiaryAddress || undefined,
        },
        bank: {
          country: bankCountry,
          name: bankName,
          address: bankAddress || undefined,
          swiftBic,
          ibanOrAcct,
        },
        intermediary: useIntermediary
          ? { name: interName || undefined, swift: interSwift || undefined, ibanOrAcct: interAcct || undefined }
          : undefined,
        fx: {
          mid: +midRate.toFixed(8),
          spreadPct: +(spreadPct * 100),     // controller stores pct (we pass %)
          customerRate: +customerRate.toFixed(8),
          locked: fxLocked,
          estReceive: +recvEstimate.toFixed(2),
        },
        purpose,
        schedule: { mode: schedule, date: schedule === "FUTURE" ? scheduleDate : null },
        reference: reference || undefined,
        memo: memo || undefined,
        // pass fees explicitly (controller has defaults too)
        fees: { bankFee, estNetworkFees },
      };

      const res = await createInternational(payload as any);
      // Expect: { referenceId, status:"OTP_REQUIRED" }
      const ref = (res as any)?.referenceId;
      const status = (res as any)?.status;

      // Optimistic local hold to match server debit
      optimisticDebit(+totalDebit.toFixed(2), fromAccount);

      // Save a tiny hand-off for Pending page (optional; UI only)
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: status || "OTP_REQUIRED",
            type: "wire_international",
            amount: { value: +totalDebit.toFixed(2), currency: sendCurrency },
            recipient: `${beneficiaryName} • ${bankName}`,
            referenceId: ref,
            createdAt: new Date().toISOString(),
            fromAccount,
            note: reference || undefined,
          })
        );
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      // Route user to the pending screen to enter OTP & wait for admin approval
      if (ref) {
        router.push(`/Transfer/pending?ref=${encodeURIComponent(ref)}`);
      } else {
        // Fallback if backend didn’t return ref (shouldn’t happen)
        router.push(`/Transfer/pending`);
      }
    } catch (e: any) {
      setErrorText(e?.message || "Failed to submit international transfer.");
    } finally {
      setSubmitting(false);
      setShowReview(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} />

      <section className="pt-[100px] container-x pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Back */}
          <div className="flex items-center gap-3 mb-6">
            <a href="/dashboard/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition">
              <ArrowLeft className="h-5 w-5" /> Back to dashboard
            </a>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">International Transfer</h1>
                <p className="text-white/70 mt-1">
                  Send from US accounts to foreign bank accounts (SWIFT).
                </p>
              </div>
              <div className="hidden sm:block text-sm text-white/70">
                Available {fromAccount}:{" "}
                <span className="text-white font-semibold">
                  {formatMoney(availableBalance, sendCurrency)}
                </span>
              </div>
            </div>

            {/* Optional top-level error */}
            {errorText && (
              <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorText}
              </div>
            )}

            {/* Form */}
            <form className="mt-6 grid gap-6" onSubmit={openReview}>
              {/* Funding / Currencies / Amount */}
              <div className="grid md:grid-cols-4 gap-5">
                <LabeledSelect
                  label="From account"
                  value={fromAccount}
                  onChange={(v) => setFromAccount(v as AccountType)}
                  options={[
                    { value: "Checking", label: `Checking — ${formatMoney(checkingBalance, sendCurrency)}` },
                    { value: "Savings", label: `Savings — ${formatMoney(savingsBalance, sendCurrency)}` },
                  ]}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <LabeledSelect
                  label="Send currency"
                  value={sendCurrency}
                  onChange={(v) => setSendCurrency(v as Currency)}
                  options={["USD","EUR","GBP","CAD","AUD","JPY","CHF","NGN","ZAR","INR","CNY"].map(c=>({value:c,label:c}))}
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <LabeledSelect
                  label="Receive currency"
                  value={recvCurrency}
                  onChange={(v) => setRecvCurrency(v as Currency)}
                  options={["USD","EUR","GBP","CAD","AUD","JPY","CHF","NGN","ZAR","INR","CNY"].map(c=>({value:c,label:c}))}
                  icon={<Globe2 className="h-4 w-4" />}
                />
                <LabeledMoney
                  label={`Amount (${sendCurrency})`}
                  value={amount}
                  onChange={setAmount}
                  icon={<DollarSign className="h-4 w-4" />}
                  hint={`Bank fee: ${formatMoney(bankFee, sendCurrency)}${feePayer==="OUR" ? ` • Est. network fees: ${formatMoney(estNetworkFees, sendCurrency)}` : ""} • Total debit: ${formatMoney(totalDebit, sendCurrency)}`}
                  invalidMsg={
                    !amount
                      ? undefined
                      : parsedAmount <= 0
                      ? "Enter a valid amount."
                      : totalDebit > availableBalance
                      ? "Insufficient funds in selected account."
                      : undefined
                  }
                />
              </div>

              {/* FX Preview */}
              <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4 text-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    Mid rate: <span className="font-medium">{`1 ${sendCurrency} ≈ ${midRate.toFixed(6)} ${recvCurrency}`}</span>
                  </div>
                  <div>Spread: <span className="font-medium">{(spreadPct * 100).toFixed(2)}%</span></div>
                  <div>
                    Your rate: <span className="font-medium">{`1 ${sendCurrency} ≈ ${customerRate.toFixed(6)} ${recvCurrency}`}</span>
                  </div>
                  <div className="ml-auto">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded-md accent-cyan-400" checked={fxLocked} onChange={(e)=>setFxLocked(e.target.checked)} />
                      Lock this quote (10 min)
                    </label>
                  </div>
                </div>
                <div className="mt-3 text-white/80">
                  You’ll send <span className="font-semibold">{formatMoney(parsedAmount, sendCurrency) || "—"}</span> and the beneficiary will receive approximately{" "}
                  <span className="font-semibold">
                    {isFinite(recvEstimate) ? recvEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"} {recvCurrency}
                  </span>.
                </div>
              </div>

              {/* Beneficiary */}
              <div className="grid md:grid-cols-4 gap-5">
                <LabeledSelect
                  label="Beneficiary type"
                  value={beneficiaryType}
                  onChange={(v) => setBeneficiaryType(v as any)}
                  options={[{ value:"Individual",label:"Individual"},{value:"Business",label:"Business"}]}
                  icon={<User className="h-4 w-4" />}
                />
                <LabeledInput
                  label="Beneficiary name"
                  value={beneficiaryName}
                  onChange={setBeneficiaryName}
                  icon={<User className="h-4 w-4" />}
                  invalidMsg={beneficiaryName && beneficiaryName.trim().length < 2 ? "Enter a valid name." : undefined}
                />
                <LabeledInput
                  label="Beneficiary email (optional)"
                  value={beneficiaryEmail}
                  onChange={setBeneficiaryEmail}
                  icon={<Mail className="h-4 w-4" />}
                />
                <LabeledInput
                  label="Beneficiary address (optional)"
                  value={beneficiaryAddress}
                  onChange={setBeneficiaryAddress}
                  icon={<NotebookPen className="h-4 w-4" />}
                />
              </div>

              {/* Bank details */}
              <div className="grid md:grid-cols-2 gap-5">
                <LabeledInput
                  label="Beneficiary bank name"
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
                  label="Bank country"
                  value={bankCountry}
                  onChange={setBankCountry}
                  icon={<Globe2 className="h-4 w-4" />}
                />
                <LabeledInput
                  label="SWIFT/BIC (8 or 11 chars)"
                  value={swiftBic}
                  onChange={(v) => setSwiftBic(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
                  icon={<Shield className="h-4 w-4" />}
                  maxLength={11}
                  invalidMsg={swiftBic && !swiftValid ? "Invalid SWIFT/BIC format." : undefined}
                />
                <LabeledInput
                  label="IBAN / Account number"
                  value={ibanOrAcct}
                  onChange={(v) => setIbanOrAcct(v.toUpperCase().trim())}
                  icon={<Lock className="h-4 w-4" />}
                  invalidMsg={ibanOrAcct && !ibanOrAcctValid ? "Enter a valid IBAN or local account number." : undefined}
                />
              </div>

              {/* Intermediary (optional) */}
              <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4">
                <label className="inline-flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-md accent-cyan-400"
                    checked={useIntermediary}
                    onChange={(e) => setUseIntermediary(e.target.checked)}
                  />
                  Use intermediary/correspondent bank
                </label>

                {useIntermediary && (
                  <div className="mt-4 grid md:grid-cols-3 gap-4">
                    <LabeledInput label="Intermediary bank name" value={interName} onChange={setInterName} icon={<Landmark className="h-4 w-4" />} />
                    <LabeledInput label="Intermediary SWIFT/BIC" value={interSwift} onChange={(v)=>setInterSwift(v.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,11))} icon={<Shield className="h-4 w-4" />} />
                    <LabeledInput label="For further credit to (acct)" value={interAcct} onChange={setInterAcct} icon={<Lock className="h-4 w-4" />} />
                  </div>
                )}
              </div>

              {/* Fees / purpose / schedule */}
              <div className="grid md:grid-cols-3 gap-5">
                <LabeledSelect
                  label="Fees (who pays network/intermediary)"
                  value={feePayer}
                  onChange={(v) => setFeePayer(v as FeePayer)}
                  options={[
                    { value: "OUR", label: "OUR — Sender pays all" },
                    { value: "SHA", label: "SHA — Split fees" },
                    { value: "BEN", label: "BEN — Beneficiary pays" },
                  ]}
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <LabeledSelect
                  label="Payment purpose"
                  value={purpose}
                  onChange={setPurpose}
                  options={[
                    "Goods/Services Payment",
                    "Family Support",
                    "Tuition",
                    "Salary",
                    "Investment",
                    "Loan Repayment",
                    "Gift/Donation",
                  ].map((p)=>({ value:p, label:p }))}
                  icon={<NotebookPen className="h-4 w-4" />}
                />
                <LabeledSelect
                  label="Schedule"
                  value={schedule}
                  onChange={(v) => setSchedule(v as any)}
                  options={[{value:"NOW",label:"Send now"},{value:"FUTURE",label:"Schedule for later"}]}
                  icon={<CalendarIcon className="h-4 w-4" />}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                <LabeledInput
                  label="Scheduled date"
                  type="date"
                  value={scheduleDate}
                  onChange={setScheduleDate}
                  disabled={schedule !== "FUTURE"}
                  min={todayISO}
                  icon={<CalendarIcon className="h-4 w-4" />}
                  invalidMsg={schedule === "FUTURE" && scheduleDate && scheduleDate < todayISO ? "Pick a future date." : undefined}
                />
                <LabeledInput
                  label="Reference (for beneficiary)"
                  value={reference}
                  onChange={setReference}
                  icon={<NotebookPen className="h-4 w-4" />}
                />
                <LabeledInput
                  label="Memo (internal)"
                  value={memo}
                  onChange={setMemo}
                  icon={<NotebookPen className="h-4 w-4" />}
                />
              </div>

              {/* Options (local-only UX flags; server records activities/insights itself) */}
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <label className="inline-flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded-md accent-cyan-400" checked={saveRecipient} onChange={(e) => setSaveRecipient(e.target.checked)} />
                  Save recipient to address book
                </label>
                <label className="inline-flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded-md accent-cyan-400" checked={emailNotify} onChange={(e) => setEmailNotify(e.target.checked)} />
                  Email me a receipt
                </label>
              </div>

              {/* Compliance confirmations */}
              <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4 text-sm space-y-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded-md accent-cyan-400" checked={confirmAccuracy} onChange={(e)=>setConfirmAccuracy(e.target.checked)} />
                  <span>I confirm all beneficiary and bank details are accurate.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded-md accent-cyan-400" checked={confirmNoSanctions} onChange={(e)=>setConfirmNoSanctions(e.target.checked)} />
                  <span>The beneficiary is not subject to sanctions and this transfer complies with applicable laws.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded-md accent-cyan-400" checked={confirmNoProhibited} onChange={(e)=>setConfirmNoProhibited(e.target.checked)} />
                  <span>This transfer is not for prohibited goods/services per our terms and the receiving bank’s policies.</span>
                </label>
              </div>

              {/* Footer actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="text-sm text-white/70">
                  Bank fee: <span className="text-white">{formatMoney(bankFee, sendCurrency)}</span>
                  {feePayer==="OUR" && <> • Est. network fees: <span className="text-white">{formatMoney(estNetworkFees, sendCurrency)}</span></>}
                  {" "}• Total debit: <span className="text-white">{formatMoney(totalDebit, sendCurrency)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href="/dashboard/dashboard" className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition">Cancel</a>
                  <button
                    type="submit"
                    disabled={!canReview}
                    className={`px-5 py-3 rounded-2xl transition shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                      canReview ? "text-[#0B0F14]" : "opacity-60 cursor-not-allowed text-[#0B0F14]"
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

      {/* Review Sheet */}
      <Sheet open={showReview} onClose={() => setShowReview(false)} title="Review international transfer">
        <div className="space-y-4 text-sm">
          <ReviewRow k="From" v={`${fromAccount} — ${formatMoney(availableBalance, sendCurrency)}`} />
          <ReviewRow k="Send currency" v={sendCurrency} />
          <ReviewRow k="Receive currency" v={recvCurrency} />
          <ReviewRow k="Amount (send)" v={`${sendCurrency} ${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <ReviewRow k="FX rate (your rate)" v={`1 ${sendCurrency} ≈ ${customerRate.toFixed(6)} ${recvCurrency}`} />
          <ReviewRow k="Estimated receive" v={`${recvCurrency} ${isFinite(recvEstimate) ? recvEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}`} />
          <div className="h-px bg-white/20 my-2" />
          <ReviewRow k="Beneficiary" v={`${beneficiaryName} (${beneficiaryType})`} />
          {beneficiaryEmail && <ReviewRow k="Beneficiary email" v={beneficiaryEmail} />}
          {beneficiaryAddress && <ReviewRow k="Beneficiary address" v={beneficiaryAddress} />}
          <div className="h-px bg-white/20 my-2" />
          <ReviewRow k="Bank" v={`${bankName}${bankAddress ? " — " + bankAddress : ""}`} />
          <ReviewRow k="Country" v={bankCountry} />
          <ReviewRow k="SWIFT/BIC" v={swiftBic} />
          <ReviewRow k="IBAN/Acct" v={ibanOrAcct} />
          {useIntermediary && (
            <>
              <div className="h-px bg-white/20 my-2" />
              <div className="text-white/80 font-medium">Intermediary bank</div>
              <ReviewRow k="Name" v={interName || "—"} />
              <ReviewRow k="SWIFT/BIC" v={interSwift || "—"} />
              <ReviewRow k="For credit to" v={interAcct || "—"} />
            </>
          )}
          <div className="h-px bg-white/20 my-2" />
          <ReviewRow k="Fees" v={feePayer === "OUR" ? "OUR — Sender pays all" : feePayer === "SHA" ? "SHA — Split fees" : "BEN — Beneficiary pays"} />
          <ReviewRow k="Purpose" v={purpose} />
          <ReviewRow k="Schedule" v={schedule === "NOW" ? "Send now" : `Scheduled — ${scheduleDate}`} />

          <div className="h-px bg-white/20 my-3" />
          <div className="flex items-center justify-between text-base">
            <div>Total debit</div>
            <div className="font-semibold">{formatMoney(totalDebit, sendCurrency)}</div>
          </div>
          <div className="text-xs text-white/60">
            Includes bank fee {formatMoney(bankFee, sendCurrency)}
            {feePayer === "OUR" ? <> and estimated network fees {formatMoney(estNetworkFees, sendCurrency)}.</> : "."}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition" onClick={() => setShowReview(false)}>
              Edit details
            </button>
            <button
              onClick={submitIntl}
              disabled={submitting}
              className="px-5 py-3 rounded-2xl text-[#0B0F14] transition shadow-[0_12px_32px_rgba(0,180,216,.35)]"
              style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
            >
              {submitting ? "Submitting…" : "Confirm & Submit"}
            </button>
          </div>
        </div>
      </Sheet>
    </main>
  );
}

/* -------------------------------- Components -------------------------------- */

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

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
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
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (!isFinite(n) || n === 0) return v.trim();
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
          placeholder="0.00"
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
