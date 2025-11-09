// app/dashboard/bills/pay/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  DollarSign,
  FileText,
  Mail,
  NotebookPen,
  Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBillPay } from "@/libs/api";

/* -----------------------------------------------------------------------------
   Pay Bill • Page  (wired to backend controller/routes)
   Server flow: debit -> ledger(pending) -> admin review -> OTP_REQUIRED
   Client: submit -> get { referenceId } -> /Transfer/pending?ref=...
----------------------------------------------------------------------------- */

type AccountType = "Checking" | "Savings";
type Method = "ACH" | "CHECK";

type Payee = {
  id: string;
  name: string;
  accountNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  method?: Method;
};

const SEED_PAYEES: Payee[] = [
  { id: "p1", name: "PG&E Utilities", accountNumber: "123-456-789", method: "ACH", email: "billing@pge.com" },
  { id: "p2", name: "City Water", accountNumber: "CW-8821-19", method: "ACH" },
  { id: "p3", name: "Evergreen Internet", accountNumber: "EG-9910", method: "CHECK" },
];

export default function PayBillPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [checkingBalance, setCheckingBalance] = useState(5023.75);
  const [savingsBalance, setSavingsBalance] = useState(8350.2);

  const [fromAccount, setFromAccount] = useState<AccountType>("Checking");
  const [payees, setPayees] = useState<Payee[]>(SEED_PAYEES);
  const [payeeId, setPayeeId] = useState<string>(SEED_PAYEES[0].id);
  const [addingNew, setAddingNew] = useState(false);

  // New payee fields
  const [newName, setNewName] = useState("");
  const [newAcct, setNewAcct] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newMethod, setNewMethod] = useState<Method>("ACH");
  const [saveNewPayee, setSaveNewPayee] = useState(true);

  // Payment
  const [amount, setAmount] = useState("");
  const [schedule, setSchedule] = useState<"NOW" | "FUTURE">("NOW");
  const [scheduleDate, setScheduleDate] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [note, setNote] = useState("");

  // UI
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const n = localStorage.getItem("hb_user_name");
    if (n) setUserName(n);
    setCheckingBalance(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
    setSavingsBalance(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));

    // hydrate saved payees
    try {
      const saved = JSON.parse(localStorage.getItem("hb_bill_payees") || "[]");
      if (Array.isArray(saved) && saved.length) {
        // avoid duplicates by id
        const existingIds = new Set(SEED_PAYEES.map(p => p.id));
        const merged = [...SEED_PAYEES, ...saved.filter((p: Payee) => !existingIds.has(p.id))];
        setPayees(merged);
      }
    } catch {}
  }, []);

  const selectedPayee = useMemo(() => payees.find((p) => p.id === payeeId), [payees, payeeId]);

  const parsedAmount = useMemo(() => {
    const a = Number(String(amount).replace(/[^\d.]/g, ""));
    return isFinite(a) ? a : 0;
  }, [amount]);

  const available = fromAccount === "Checking" ? checkingBalance : savingsBalance;
  const amountValid = parsedAmount > 0 && parsedAmount <= available;
  const scheduleValid = schedule === "NOW" || (schedule === "FUTURE" && scheduleDate >= todayISO);

  const newPayeeOk =
    !addingNew ||
    (newName.trim().length >= 2 &&
      (newEmail || newPhone || newAddress) &&
      newMethod);

  const canReview = amountValid && scheduleValid && (addingNew ? newPayeeOk : !!selectedPayee);

  function formatMoney(n: number) {
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  function openReview(e: React.FormEvent) {
    e.preventDefault();
    if (!canReview) return;
    setShowReview(true);
  }

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

  function maybeSaveNewPayee() {
    if (!addingNew || !saveNewPayee) return;
    const newP: Payee = {
      id: "bp-" + Math.random().toString(36).slice(2, 8),
      name: newName.trim(),
      accountNumber: newAcct || undefined,
      email: newEmail || undefined,
      phone: newPhone || undefined,
      address: newAddress || undefined,
      method: newMethod,
    };
    try {
      const saved = JSON.parse(localStorage.getItem("hb_bill_payees") || "[]");
      const next = [newP, ...(Array.isArray(saved) ? saved : [])];
      localStorage.setItem("hb_bill_payees", JSON.stringify(next));
    } catch {}
  }

  async function submitPayment() {
    if (!canReview || submitting) return;
    setSubmitting(true);
    setErrorText(null);

    const method: Method = addingNew ? newMethod : (selectedPayee?.method || "ACH");
    const payeeName = addingNew ? newName.trim() : (selectedPayee?.name || "Payee");
    const payeeAcct = addingNew ? newAcct : selectedPayee?.accountNumber;
    const payeeEmail = addingNew ? newEmail : selectedPayee?.email;
    const payeePhone = addingNew ? newPhone : selectedPayee?.phone;
    const payeeAddress = addingNew ? newAddress : selectedPayee?.address;

    try {
      // Build payload expected by your backend createBillPay controller
      const payload = {
        fromAccount,
        amount: +parsedAmount.toFixed(2),
        schedule: { mode: schedule, date: schedule === "FUTURE" ? scheduleDate : null },
        payee: {
          name: payeeName,
          accountRef: payeeAcct || undefined,
          email: payeeEmail || undefined,
          phone: payeePhone || undefined,
          address: payeeAddress || undefined,
          method, // "ACH" | "CHECK"
        },
        invoiceId: invoiceId || undefined,
        note: note || undefined,
      };

      const res = await createBillPay(payload as any);
      // Expect: { referenceId, status: "OTP_REQUIRED", ... }
      const ref = (res as any)?.referenceId || (res as any)?.id;

      // Optimistic local hold to mirror server debit
      optimisticDebit(+parsedAmount.toFixed(2), fromAccount);

      // Save new payee locally if requested
      maybeSaveNewPayee();

      // Stash a tiny hand-off object for Pending screen (purely UI)
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: (res as any)?.status || "OTP_REQUIRED",
            type: "billpay",
            amount: { value: +parsedAmount.toFixed(2), currency: "USD" },
            recipient: payeeName,
            referenceId: ref,
            createdAt: new Date().toISOString(),
            fromAccount,
            method,
            schedule: schedule === "NOW" ? null : scheduleDate,
            note: note || undefined,
          })
        );
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      setSubmittedRef(ref || null);
      setShowReview(false);
      // Go to pending (OTP entry + wait for admin approval)
      if (ref) {
        router.push(`/Transfer/pending?ref=${encodeURIComponent(ref)}`);
      } else {
        router.push(`/Transfer/pending`);
      }
    } catch (e: any) {
      setErrorText(e?.message || "Failed to submit bill payment.");
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="text-xl md:text-2xl font-semibold">Pay a bill</h1>
            <p className="text-white/70 mt-1">Pick a payee or add a new one. Set amount and date, then confirm.</p>

            {errorText && (
              <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {errorText}
              </div>
            )}

            <form className="mt-6 grid gap-6" onSubmit={openReview}>
              {/* From + Amount + Date */}
              <div className="grid md:grid-cols-3 gap-5">
                <FieldSelect
                  label="Pay from"
                  value={fromAccount}
                  onChange={(v) => setFromAccount(v as AccountType)}
                  options={[
                    { value: "Checking", label: `Checking — ${formatMoney(checkingBalance)}` },
                    { value: "Savings", label: `Savings — ${formatMoney(savingsBalance)}` },
                  ]}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <FieldMoney
                  label="Amount (USD)"
                  value={amount}
                  onChange={setAmount}
                  icon={<DollarSign className="h-4 w-4" />}
                  invalidMsg={
                    amount
                      ? !amountValid
                        ? parsedAmount <= 0
                          ? "Enter a valid amount."
                          : "Insufficient funds."
                        : undefined
                      : undefined
                  }
                />
                <FieldSelect
                  label="Schedule"
                  value={schedule}
                  onChange={(v) => setSchedule(v as any)}
                  options={[
                    { value: "NOW", label: "Pay now" },
                    { value: "FUTURE", label: "Schedule for later" },
                  ]}
                  icon={<CalendarIcon className="h-4 w-4" />}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                <FieldInput
                  label="Scheduled date"
                  type="date"
                  value={scheduleDate}
                  onChange={setScheduleDate}
                  disabled={schedule !== "FUTURE"}
                  min={todayISO}
                  icon={<CalendarIcon className="h-4 w-4" />}
                  invalidMsg={schedule === "FUTURE" && scheduleDate && scheduleDate < todayISO ? "Pick a future date." : undefined}
                />
                <FieldInput
                  label="Invoice / account reference (optional)"
                  value={invoiceId}
                  onChange={setInvoiceId}
                  icon={<FileText className="h-4 w-4" />}
                  placeholder="Invoice #92818"
                />
                <FieldInput
                  label="Memo (optional)"
                  value={note}
                  onChange={setNote}
                  icon={<NotebookPen className="h-4 w-4" />}
                  placeholder="October bill"
                />
              </div>

              {/* Payee selector */}
              {!addingNew ? (
                <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm text-white/70">Payee</div>
                    <select
                      value={payeeId}
                      onChange={(e) => setPayeeId(e.target.value)}
                      className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 text-sm"
                    >
                      {payees.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.method ? `• ${p.method}` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setAddingNew(true)}
                      className="ml-auto px-3 py-2 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                    >
                      + New payee
                    </button>
                  </div>
                  {selectedPayee && (
                    <div className="mt-3 text-xs text-white/60">
                      Default method: <span className="text-white/80">{selectedPayee.method || "ACH/Check"}</span>
                      {selectedPayee.accountNumber && <> • Account: <span className="text-white/80">{selectedPayee.accountNumber}</span></>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-white/80 font-medium">New payee</div>
                    <button
                      type="button"
                      onClick={() => setAddingNew(false)}
                      className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                    >
                      Use saved payee
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FieldInput label="Name" value={newName} onChange={setNewName} placeholder="ACME Energy Co." />
                    <FieldInput label="Payee account/ref (optional)" value={newAcct} onChange={setNewAcct} placeholder="Acct 123-456-789" />
                    <FieldInput label="Email (optional)" value={newEmail} onChange={setNewEmail} icon={<Mail className="h-4 w-4" />} />
                    <FieldInput label="Phone (optional)" value={newPhone} onChange={setNewPhone} icon={<Phone className="h-4 w-4" />} />
                    <FieldInput label="Address (optional)" value={newAddress} onChange={setNewAddress} />
                    <FieldSelect
                      label="Preferred method"
                      value={newMethod}
                      onChange={(v) => setNewMethod(v as Method)}
                      options={[
                        { value: "ACH", label: "ACH (fast, recommended)" },
                        { value: "CHECK", label: "Mailed check (3–7 biz days)" },
                      ]}
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 mt-3 text-sm">
                    <input type="checkbox" className="h-4 w-4 rounded-md accent-cyan-400" checked={saveNewPayee} onChange={(e) => setSaveNewPayee(e.target.checked)} />
                    Save this payee
                  </label>
                  {!newPayeeOk && (
                    <div className="mt-2 text-xs text-rose-300">Enter a name and at least one contact detail.</div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="text-sm text-white/70">
                  Available: <span className="text-white">{formatMoney(available)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href="/dashboard/dashboard" className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15">Cancel</a>
                  <button
                    type="submit"
                    disabled={!canReview}
                    className={`px-5 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] ${canReview ? "" : "opacity-60 cursor-not-allowed"}`}
                    style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                  >
                    Review & Pay
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Submitted toast (optional visual) */}
          {submittedRef && (
            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <div className="text-emerald-200 font-medium">Payment submitted</div>
                <div className="text-white/80 mt-1">
                  Reference <span className="font-mono">{submittedRef}</span>.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Review Sheet */}
      <Sheet open={showReview} onClose={() => setShowReview(false)} title="Review bill payment">
        <div className="space-y-4 text-sm">
          <ReviewRow k="From" v={`${fromAccount}`} />
          <ReviewRow k="Amount" v={formatMoney(parsedAmount)} />
          <ReviewRow k="Schedule" v={schedule === "NOW" ? "Pay now" : `Scheduled — ${scheduleDate}`} />
          <div className="h-px bg-white/20 my-2" />
          {addingNew ? (
            <>
              <ReviewRow k="Payee" v={newName || "—"} />
              {newAcct && <ReviewRow k="Payee account/ref" v={newAcct} />}
              {newEmail && <ReviewRow k="Email" v={newEmail} />}
              {newPhone && <ReviewRow k="Phone" v={newPhone} />}
              {newAddress && <ReviewRow k="Address" v={newAddress} />}
              <ReviewRow k="Method" v={newMethod === "ACH" ? "ACH" : "Mailed check"} />
            </>
          ) : (
            <>
              <ReviewRow k="Payee" v={selectedPayee?.name || "—"} />
              {selectedPayee?.accountNumber && <ReviewRow k="Payee account/ref" v={selectedPayee.accountNumber} />}
              <ReviewRow k="Method" v={selectedPayee?.method || "ACH/Check"} />
            </>
          )}
          {invoiceId && <ReviewRow k="Invoice/ref" v={invoiceId} />}
          {note && <ReviewRow k="Memo" v={note} />}

          <div className="h-px bg-white/20 my-3" />
          <div className="flex items-center justify-between text-base">
            <div>Total (auth-hold)</div>
            <div className="font-semibold">{formatMoney(parsedAmount)}</div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15" onClick={() => setShowReview(false)}>Edit</button>
            <button
              onClick={submitPayment}
              disabled={submitting}
              className="px-5 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)]"
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

/* ----- local helpers/components ----- */

function FieldInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
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
          className={`w-full rounded-2xl bg-white/10 border ${invalidMsg ? "border-rose-400/60" : "border-white/20"} ${icon ? "pl-11" : "pl-4"} pr-4 py-3 text-base shadow-inner`}
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
  icon?: React.ReactNode;
  invalidMsg?: string;
}) {
  const { label, value, onChange, icon, invalidMsg } = props;
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80">{icon}</div>}
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const n = Number(String(value).replace(/[^\d.]/g, ""));
            if (isFinite(n)) onChange(n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          }}
          placeholder="0.00"
          className={`w-full rounded-2xl bg-white/10 border ${invalidMsg ? "border-rose-400/60" : "border-white/20"} ${icon ? "pl-11" : "pl-4"} pr-4 py-3 text-base shadow-inner`}
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
  icon?: React.ReactNode;
}) {
  const { label, value, onChange, options, icon } = props;
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
            <option key={o.value} value={o.value}>{o.label}</option>
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
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[640px] bg-[#0F1622] border-l border-white/20 shadow-[0_12px_48px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/20">
          <h3 className="text-base font-semibold">{title}</h3>
          <button aria-label="Close" className="h-10 w-10 rounded-2xl hover:bg-white/15 grid place-items-center" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100%-64px)]">{children}</div>
      </div>
    </div>
  );
}
