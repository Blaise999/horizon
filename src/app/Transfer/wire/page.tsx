// app/dashboard/transfers/wire/page.tsx
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
import API, { afterCreateTransfer } from "@/libs/api";

type AccountType = "Checking" | "Savings";
type WireType = "DOMESTIC" | "INTERNATIONAL";
type FeePayer = "OUR" | "SHA" | "BEN";
type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "CHF" | "NGN" | "ZAR";

export default function WireTransferPage() {
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
        const me = await API.me(); // {user: {...}}
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

  const [wireType, setWireType] = useState<WireType>("DOMESTIC");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState<string>("");

  // Beneficiary (REQUIRED)
  const [beneficiaryType, setBeneficiaryType] = useState<"Individual" | "Business">("Individual");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState(""); // required
  const [beneficiaryAddress, setBeneficiaryAddress] = useState(""); // required

  // Beneficiary Bank (domestic)
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState(""); // required
  const [routingNumber, setRoutingNumber] = useState(""); // ABA 9
  const [accountNumber, setAccountNumber] = useState("");
  const [accountNumber2, setAccountNumber2] = useState("");
  const [beneficiaryAcctType, setBeneficiaryAcctType] = useState<AccountType>("Checking");

  // Beneficiary Bank (international)
  const [bankCountry, setBankCountry] = useState("United Kingdom");
  const [swiftBic, setSwiftBic] = useState(""); // 8 or 11
  const [ibanOrAcct, setIbanOrAcct] = useState(""); // IBAN or local acct
  const [purpose, setPurpose] = useState("Goods/Services Payment");

  // Intermediary (optional)
  const [useIntermediary, setUseIntermediary] = useState(false);
  const [interName, setInterName] = useState("");
  const [interSwift, setInterSwift] = useState("");
  const [interAcct, setInterAcct] = useState("");

  // Fees (intl)
  const [feePayer, setFeePayer] = useState<FeePayer>("SHA");

  // Schedule / memo
  const [schedule, setSchedule] = useState<"NOW" | "FUTURE">("NOW");
  const [scheduleDate, setScheduleDate] = useState("");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");

  // Options
  const [saveRecipient, setSaveRecipient] = useState(true);
  const [emailNotify, setEmailNotify] = useState(true);

  // UI
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // OTP
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpRef, setOtpRef] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  /* ------------------------------ Formatting ------------------------------ */
  const moneyFmt = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency }),
    [currency]
  );
  const numFmt2 = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );
  function formatMoney(v: number) {
    try {
      return moneyFmt.format(v || 0);
    } catch {
      return `$${(v || 0).toFixed(2)}`;
    }
  }

  const availableBalance = fromAccount === "Checking" ? checkingBalance : savingsBalance;

  const parsedAmount = useMemo(() => {
    const a = Number(String(amount).replace(/[^\d.]/g, ""));
    return isFinite(a) ? a : 0;
  }, [amount]);

  const bankFee = useMemo(() => (wireType === "DOMESTIC" ? 18 : 35), [wireType]);
  const estIntermediaryFees = useMemo(
    () => (wireType === "INTERNATIONAL" ? 15 : 0),
    [wireType]
  );
  const totalDebit =
    parsedAmount +
    bankFee +
    (wireType === "INTERNATIONAL" && feePayer === "OUR" ? estIntermediaryFees : 0);

  /* -------------------------------- Validation -------------------------------- */
  const emailValid =
    !!beneficiaryEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(beneficiaryEmail.trim());
  const addressValid = beneficiaryAddress.trim().length >= 5;
  const bankAddrValid = bankAddress.trim().length >= 3;
  const bankValid = bankName.trim().length >= 2;
  const nameValid = beneficiaryName.trim().length >= 2;

  const routingValid = /^\d{9}$/.test(routingNumber);
  const acctMatch = accountNumber.length >= 4 && accountNumber === accountNumber2;

  const swiftValid =
    wireType === "INTERNATIONAL" ? /^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/.test(swiftBic) : true;
  const ibanOrAcctValid = wireType === "INTERNATIONAL" ? ibanOrAcct.trim().length >= 8 : true;

  const scheduleValid =
    schedule === "NOW" || (schedule === "FUTURE" && !!todayISO && scheduleDate >= todayISO);

  const domesticOk =
    wireType === "DOMESTIC" &&
    routingValid &&
    acctMatch &&
    nameValid &&
    emailValid &&
    addressValid &&
    bankValid &&
    bankAddrValid;

  const intlOk =
    wireType === "INTERNATIONAL" &&
    nameValid &&
    emailValid &&
    addressValid &&
    bankValid &&
    bankAddrValid &&
    swiftValid &&
    ibanOrAcctValid;

  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [confirmNoSanctions, setConfirmNoSanctions] = useState(false);
  const [confirmNoProhibited, setConfirmNoProhibited] = useState(false);
  const complianceOk = confirmAccuracy && confirmNoSanctions && confirmNoProhibited;

  const amountValid = parsedAmount > 0 && totalDebit <= availableBalance;
  const canReview = amountValid && scheduleValid && (domesticOk || intlOk) && complianceOk;

  /* -------------------------------- Helpers -------------------------------- */
  function maskAcct(acct: string) {
    const end = acct.slice(-4);
    return "•••• " + end;
  }
  function etaText(): string {
    return wireType === "DOMESTIC" ? "Same business day (cutoff dependent)" : "1–2 business days (SWIFT)";
  }
  function openReview(e: React.FormEvent) {
    e.preventDefault();
    if (!canReview) return;
    setShowReview(true);
  }

  // Map common country names to ISO-2 for backend
  const iso2 = (name: string) => {
    const m: Record<string, string> = {
      "United States": "US",
      "United Kingdom": "GB",
      "England": "GB",
      "Wales": "GB",
      "Scotland": "GB",
      "Northern Ireland": "GB",
      "Germany": "DE",
      "France": "FR",
      "Canada": "CA",
      "Australia": "AU",
      "Japan": "JP",
      "Switzerland": "CH",
      "Nigeria": "NG",
      "South Africa": "ZA",
    };
    if (!name) return "";
    return (m[name.trim()] || name.trim().slice(0, 2)).toUpperCase();
  };

  /* -------------------------------- Submit flow ------------------------------- */
  async function submitWire() {
    if (!canReview || submitting) return;
    setSubmitting(true);
    setOtpError(null);

    try {
      const isDomestic = wireType === "DOMESTIC";

      // Normalize currencies
      const sendCur = String(currency).toUpperCase();
      const recvCur = sendCur; // adjust later if you add FX selection

      let payload: any;

      if (isDomestic) {
        // Keep domestic flow as-is (you can adapt to your US handler as needed)
        payload = {
          rail: "usa",
          delivery: "WIRE",
          fromAccount,
          amount: +parsedAmount.toFixed(2), // number (major units)
          currency: sendCur,

          // Recipient block (for your UI + possible server aliases)
          recipient: {
            name: beneficiaryName,
            email: beneficiaryEmail,
            address: { street1: beneficiaryAddress },
            bankName,
            bankAddress,
            routingNumber,
            accountNumber,
            recipientName: beneficiaryName,
          },

          // Top-level aliases for stricter validators / existing US handler
          recipientName: beneficiaryName,
          recipient_name: beneficiaryName,
          ["Recipient Name"]: beneficiaryName,
          recipientEmail: beneficiaryEmail,
          bankName,
          bankAddress,
          recipientAcctType: beneficiaryAcctType,
          routing: routingNumber,
          account: accountNumber,

          feePayer: "OUR", // domestic wires often charged to sender
          schedule: schedule === "NOW" ? { mode: "NOW", date: null } : { mode: "FUTURE", date: scheduleDate || null },
          reference,
          memo,

          // Admin/receipt metadata
          adminQueue: true,
          adminSurface: "wire_domestic",
          receiptMeta: {
            sender: { accountLabel: fromAccount, balanceBefore: availableBalance },
            recipient: {
              displayName: beneficiaryName,
              name: beneficiaryName,
              email: beneficiaryEmail,
              address: beneficiaryAddress,
              bankName,
              bankAddress,
              country: "US",
              accountMasked: maskAcct(accountNumber),
              routing: routingNumber,
              accountType: beneficiaryAcctType,
            },
            fees: { bankFee, networkFee: 0, currency: sendCur },
            schedule: schedule === "NOW" ? "NOW" : scheduleDate,
            purpose,
          },

          emailNotify,
          saveRecipient,
        };
      } else {
        // INTERNATIONAL — match createInternationalWire’s expectations
        payload = {
          // _normalizeIncoming needs fromAccount, currency, amount to compute amountCents
          fromAccount,
          amount: +parsedAmount.toFixed(2), // number (major units)
          currency: sendCur,

          // Controller-level fields
          sendCurrency: sendCur,
          recvCurrency: recvCur,
          feePayer: String(feePayer || "SHA").toUpperCase(),

          // REQUIRED by server guard: bank.name && bank.swiftBic && bank.ibanOrAcct
          bank: {
            name: bankName,
            address: bankAddress || undefined,
            country: iso2(bankCountry),
            swiftBic: swiftBic,     // camelCase key
            ibanOrAcct: ibanOrAcct, // single accepted field
          },

          // Beneficiary object (server sets beneficiary.name = t.recipient)
          beneficiary: {
            type: beneficiaryType,
            name: beneficiaryName,
            email: beneficiaryEmail || undefined,
            address: beneficiaryAddress || undefined,
          },

          // CRITICAL: server ensures t.recipient length > 0
          recipient: beneficiaryName,

          // Optional intermediary in same key style
          intermediary: useIntermediary
            ? {
                name: interName || undefined,
                swiftBic: interSwift || undefined,
                ibanOrAcct: interAcct || undefined,
              }
            : undefined,

          purpose,
          schedule: schedule === "NOW" ? { mode: "NOW", date: null } : { mode: "FUTURE", date: scheduleDate || null },
          reference: reference || undefined,
          memo: memo || undefined,

          // Fees as major units (backend converts to cents)
          fees: {
            bankFee: bankFee,
            estNetworkFees: feePayer === "OUR" ? estIntermediaryFees : 0,
          },

          // Extras for your admin/receipt surfaces (optional)
          adminQueue: true,
          adminSurface: "wire_international",
          receiptMeta: {
            sender: { accountLabel: fromAccount, balanceBefore: availableBalance },
            recipient: {
              displayName: beneficiaryName,
              name: beneficiaryName,
              email: beneficiaryEmail,
              address: beneficiaryAddress,
              bankName,
              bankAddress,
              country: iso2(bankCountry),
              swift: swiftBic,
              ibanOrAcct,
            },
            fees: {
              bankFee,
              networkFee: feePayer === "OUR" ? estIntermediaryFees : 0,
              currency: sendCur,
            },
            schedule: schedule === "NOW" ? "NOW" : scheduleDate,
            purpose,
          },

          emailNotify,
          saveRecipient,
        };
      }

      const res: any = await API.initiateTransfer(payload);

      const referenceId =
        res?.referenceId || res?.ref || ("WR-" + Math.random().toString(36).slice(2, 10).toUpperCase());

      if (res?.status === "OTP_REQUIRED") {
        setOtpRef(referenceId);
        setOtpOpen(true);
        return;
      }

      // Local handoff for Pending screen (no-OTP path)
      afterCreateTransfer(router, {
        referenceId,
        status: res?.status || "PENDING_ADMIN",
        eta: etaText(),
        amount: { value: parsedAmount, currency: sendCur },
        rail: isDomestic ? "wire_domestic" : "wire_international",
        sender: { accountName: fromAccount },
        recipient: {
          name: beneficiaryName,
          email: beneficiaryEmail,
          address: beneficiaryAddress,
          bankName,
          bankAddress,
          country: !isDomestic ? bankCountry : undefined,
          swift: !isDomestic ? swiftBic : undefined,
          ibanMasked: !isDomestic ? ibanOrAcct : undefined,
          accountMasked: isDomestic ? maskAcct(accountNumber) : undefined,
        },
        fees: {
          app: bankFee,
          network: !isDomestic && feePayer === "OUR" ? estIntermediaryFees : 0,
          currency: sendCur,
        },
        note: memo || reference || undefined,
      });
    } catch (err: any) {
      alert(err?.message || "Couldn't submit wire transfer. Please review details and try again.");
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
      // Use plural route + { otp } payload to match backend
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
      const r = await fetch(`${API_BASE}/transfers/${encodeURIComponent(otpRef)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode }),
      });
      const data = await r.json();
      if (!r.ok || data?.ok === false) {
        throw new Error(data?.error || "Invalid code");
      }

      try {
        localStorage.setItem("hb_open_txn", "1");
      } catch {}
      router.push(`/Transfer/pending?ref=${encodeURIComponent(otpRef)}`);
    } catch (e: any) {
      setOtpError(e?.message || "Invalid code. Try again.");
    } finally {
      setSubmitting(false);
      setOtpOpen(false);
      setOtpCode("");
    }
  }

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={isHydrated ? userName : "—"} />

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
                <h1 className="text-xl md:text-2xl font-semibold">Wire Transfer</h1>
                <p className="text-white/70 mt-1">
                  Send funds via <span className="text-white">Domestic</span> or <span className="text-white">International</span> wire.
                </p>
              </div>
              <div className="hidden sm:block text-sm text-white/70">
                Available {fromAccount}:{" "}
                <span className="text-white font-semibold">{isHydrated ? formatMoney(availableBalance) : "—"}</span>
              </div>
            </div>

            {/* Form */}
            <form className="mt-6 grid gap-6" onSubmit={openReview}>
              {/* Top row */}
              <div className="grid md:grid-cols-4 gap-5">
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
                <LabeledSelect
                  label="Wire type"
                  value={wireType}
                  onChange={(v) => setWireType(v as WireType)}
                  options={[
                    { value: "DOMESTIC", label: "Domestic (US)" },
                    { value: "INTERNATIONAL", label: "International" },
                  ]}
                  icon={<Globe2 className="h-4 w-4" />}
                />
                <LabeledSelect
                  label="Currency"
                  value={currency}
                  onChange={(v) => setCurrency(v as Currency)}
                  options={["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "NGN", "ZAR"].map((c) => ({
                    value: c,
                    label: c,
                  }))}
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <LabeledMoney
                  label="Amount"
                  value={amount}
                  onChange={setAmount}
                  icon={<DollarSign className="h-4 w-4" />}
                  hint={`Bank fee: ${formatMoney(bankFee)}${
                    wireType === "INTERNATIONAL"
                      ? ` • Est. network fees (${feePayer}): ${feePayer === "OUR" ? formatMoney(estIntermediaryFees) : "$0.00"}`
                      : ""
                  } • Total debit: ${formatMoney(totalDebit)}`}
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
              </div>

              {/* Beneficiary */}
              <div className="grid md:grid-cols-4 gap-5">
                <LabeledSelect
                  label="Beneficiary type"
                  value={beneficiaryType}
                  onChange={(v) => setBeneficiaryType(v as any)}
                  options={[
                    { value: "Individual", label: "Individual" },
                    { value: "Business", label: "Business" },
                  ]}
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
                  label="Beneficiary email"
                  value={beneficiaryEmail}
                  onChange={setBeneficiaryEmail}
                  icon={<Mail className="h-4 w-4" />}
                  invalidMsg={beneficiaryEmail && !emailValid ? "Enter a valid email." : undefined}
                />
                <LabeledInput
                  label="Beneficiary address"
                  value={beneficiaryAddress}
                  onChange={setBeneficiaryAddress}
                  icon={<NotebookPen className="h-4 w-4" />}
                  invalidMsg={beneficiaryAddress && !addressValid ? "Enter a valid address." : undefined}
                />
              </div>

              {/* Bank details (switch by wire type) */}
              {wireType === "DOMESTIC" ? (
                <>
                  <div className="grid md:grid-cols-2 gap-5">
                    <LabeledInput
                      label="Beneficiary bank name"
                      value={bankName}
                      onChange={setBankName}
                      icon={<Landmark className="h-4 w-4" />}
                      invalidMsg={bankName && bankName.trim().length < 2 ? "Enter a valid bank name." : undefined}
                    />
                    <LabeledInput
                      label="Bank address"
                      value={bankAddress}
                      onChange={setBankAddress}
                      icon={<NotebookPen className="h-4 w-4" />}
                      invalidMsg={bankAddress && !bankAddrValid ? "Enter a valid bank address." : undefined}
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
                    <LabeledInput label="Account number" value={accountNumber} onChange={(v) => setAccountNumber(v.replace(/\s/g, ""))} icon={<Lock className="h-4 w-4" />} />
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
                      label="Beneficiary account type"
                      value={beneficiaryAcctType}
                      onChange={(v) => setBeneficiaryAcctType(v as AccountType)}
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
                </>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-5">
                    <LabeledInput
                      label="Beneficiary bank name"
                      value={bankName}
                      onChange={setBankName}
                      icon={<Landmark className="h-4 w-4" />}
                      invalidMsg={bankName && bankName.trim().length < 2 ? "Enter a valid bank name." : undefined}
                    />
                    <LabeledInput
                      label="Bank address"
                      value={bankAddress}
                      onChange={setBankAddress}
                      icon={<NotebookPen className="h-4 w-4" />}
                      invalidMsg={bankAddress && !bankAddrValid ? "Enter a valid bank address." : undefined}
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-5">
                    <LabeledInput label="Bank country" value={bankCountry} onChange={setBankCountry} icon={<Globe2 className="h-4 w-4" />} />
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
                    <label className="inline-flex items-center gap-3 text_sm">
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
                        <LabeledInput
                          label="Intermediary SWIFT/BIC"
                          value={interSwift}
                          onChange={(v) => setInterSwift(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
                          icon={<Shield className="h-4 w-4" />}
                        />
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
                      ].map((p) => ({ value: p, label: p }))}
                      icon={<NotebookPen className="h-4 w-4" />}
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
                  </div>
                  <div className="grid md:grid-cols-3 gap-5">
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
                    <LabeledInput label="Reference (for beneficiary)" value={reference} onChange={setReference} icon={<NotebookPen className="h-4 w-4" />} />
                    <LabeledInput label="Memo (internal)" value={memo} onChange={setMemo} icon={<NotebookPen className="h-4 w-4" />} />
                  </div>
                </>
              )}

              {/* Options */}
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
              </div>

              {/* Compliance confirmations */}
              <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4 text-sm space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded-md accent-cyan-400"
                    checked={confirmAccuracy}
                    onChange={(e) => setConfirmAccuracy(e.target.checked)}
                  />
                  <span>I confirm all beneficiary and bank details are accurate.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded-md accent-cyan-400"
                    checked={confirmNoSanctions}
                    onChange={(e) => setConfirmNoSanctions(e.target.checked)}
                  />
                  <span>The beneficiary is not subject to sanctions and this transfer complies with applicable laws.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded-md accent-cyan-400"
                    checked={confirmNoProhibited}
                    onChange={(e) => setConfirmNoProhibited(e.target.checked)}
                  />
                  <span>This transfer is not for prohibited goods/services per our terms and the receiving bank’s policies.</span>
                </label>
              </div>

              {/* Footer actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="text-sm text-white/70">
                  Bank fee: <span className="text-white">{formatMoney(bankFee)}</span>
                  {wireType === "INTERNATIONAL" && (
                    <>
                      {" "}• Est. network fees ({feePayer}):{" "}
                      <span className="text-white">
                        {feePayer === "OUR" ? formatMoney(estIntermediaryFees) : "$0.00"}
                      </span>
                    </>
                  )}{" "}
                  • Total debit: <span className="text-white">{isHydrated ? formatMoney(totalDebit) : "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href="/dashboard/dashboard" className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition">
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

      {/* Review Sheet */}
      <Sheet open={showReview} onClose={() => setShowReview(false)} title="Review wire transfer">
        <div className="space-y-4 text-sm">
          <ReviewRow k="From" v={`${fromAccount} — ${isHydrated ? formatMoney(availableBalance) : "—"}`} />
          <ReviewRow k="Type" v={wireType === "DOMESTIC" ? "Domestic (US)" : "International"} />
          <ReviewRow k="Currency / Amount" v={`${currency} ${numFmt2.format(parsedAmount || 0)}`} />
          <ReviewRow k="Beneficiary" v={`${beneficiaryName} (${beneficiaryType})`} />
          <ReviewRow k="Beneficiary email" v={beneficiaryEmail} />
          <ReviewRow k="Beneficiary address" v={beneficiaryAddress} />

          <div className="h-px bg-white/20 my-2" />
          <ReviewRow k="Bank" v={`${bankName}${bankAddress ? " — " + bankAddress : ""}`} />
          {wireType === "DOMESTIC" ? (
            <>
              <ReviewRow k="Routing (ABA)" v={routingNumber} />
              <ReviewRow k="Account" v={`${maskAcct(accountNumber)} (${beneficiaryAcctType})`} />
            </>
          ) : (
            <>
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
              <ReviewRow
                k="Fees"
                v={feePayer === "OUR" ? "OUR — Sender pays all" : feePayer === "SHA" ? "SHA — Split fees" : "BEN — Beneficiary pays"}
              />
              <ReviewRow k="Purpose" v={purpose} />
            </>
          )}

          <div className="h-px bg-white/20 my-2" />
          <ReviewRow k="Schedule" v={schedule === "NOW" ? "Send now" : `Scheduled — ${scheduleDate || "—"}`} />
          {reference && <ReviewRow k="Reference" v={reference} />}
          {memo && <ReviewRow k="Memo" v={memo} />}

          <div className="h-px bg-white/20 my-3" />
          <div className="flex items-center justify-between text-base">
            <div>Total debit (estimate)</div>
            <div className="font-semibold">{isHydrated ? formatMoney(totalDebit) : "—"}</div>
          </div>
          <div className="text-xs text-white/60">
            Includes bank fee {formatMoney(bankFee)}
            {wireType === "INTERNATIONAL" && feePayer === "OUR" ? <> and estimated network fees {formatMoney(estIntermediaryFees)}.</> : "."}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition" onClick={() => setShowReview(false)}>
              Edit details
            </button>
            <button
              onClick={submitWire}
              disabled={submitting || !isHydrated}
              className="px-5 py-3 rounded-2xl text-[#0B0F14] transition shadow-[0_12px_32px_rgba(0,180,216,.35)]"
              style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
            >
              {submitting ? "Sending…" : "Confirm & Send"}
            </button>
          </div>
        </div>
      </Sheet>

      {/* OTP Sheet */}
      <OtpSheet open={otpOpen} onClose={() => setOtpOpen(false)} onSubmit={verifyOtpNow} code={otpCode} setCode={setOtpCode} error={otpError} />
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
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
      {invalidMsg ? <span className="text-xs text-rose-300">{invalidMsg}</span> : hint && <span className="text-xs text-white/60">{hint}</span>}
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
        <div className="flex items-center justify_between px-6 py-5 border-b border-white/20">
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
          <h3 className="text-base font_semibold">Enter OTP to continue</h3>
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
            We’ve sent a one-time passcode to your email. Enter it below to submit your wire for admin approval.
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
            <button className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg_white/15 transition" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-5 py-3 rounded-2xl text-[#0B0F14] transition shadow-[0_12px_32px_rgba(0,180,216,.35)]"
              style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)"}}
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
