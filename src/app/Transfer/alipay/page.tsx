// app/Transfer/alipay/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";

// Canonical API helpers
import API, {
  me,
  myAccounts,
  createAlipay,
  verifyTransferOtp,
  afterCreateTransfer,
} from "@/libs/api";

type AccountName = "Checking" | "Savings";
type OtpStep = "idle" | "waiting" | "verifying";

/* ── Formatters ── */
const USD_FMT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const NUM2_FMT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AlipaySendPage() {
  const router = useRouter();

  // Display (read-only)
  const [userName, setUserName] = useState("User");
  const [checking, setChecking] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Form
  const [payFrom, setPayFrom] = useState<AccountName>("Checking");
  const [amount, setAmount] = useState<string>("20.00");
  const [recipient, setRecipient] = useState<string>(""); // Alipay ID or phone
  const [note, setNote] = useState<string>("");
  const [scanQr, setScanQr] = useState<boolean>(false);

  // Flow state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [serverCreate, setServerCreate] = useState<any>(null);

  /* -------------------------------------------------------------------------- */
  /* Load profile + balances (display-only)                                      */
  /* -------------------------------------------------------------------------- */
  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await me(); // normalized by API: { user, ... } or user
        if (cancelled) return;
        const u: any = (m as any)?.user ?? m;

        const full =
          [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
          u?.fullName ||
          u?.handle ||
          "User";
        setUserName(full);

        // balances (use me() or myAccounts(); me() already carries balances on user)
        if (u?.balances) {
          setChecking(Number(u.balances.checking ?? 0));
          setSavings(Number(u.balances.savings ?? 0));
        } else {
          const a = await myAccounts().catch(() => null);
          if (a?.checking?.available != null) setChecking(a.checking.available);
          if (a?.savings?.available != null) setSavings(a.savings.available);
        }
      } catch {
        // fallback to demo/localStorage
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

  // pick richer account when hydrated
  useEffect(() => {
    if (!isHydrated) return;
    setPayFrom((checking ?? 0) >= (savings ?? 0) ? "Checking" : "Savings");
  }, [isHydrated, checking, savings]);

  /* -------------------------------------------------------------------------- */
  /* Derived                                                                     */
  /* -------------------------------------------------------------------------- */
  const amt = useMemo(() => {
    const n = Number(String(amount).replace(/[,$\s]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }, [amount]);

  const balance = payFrom === "Checking" ? checking : savings;

  function fmt(n: number) {
    return USD_FMT.format(n);
  }

  function isValidRecipient(v: string) {
    const s = (v || "").trim();
    if (!s) return false;
    // Basic Alipay patterns: phone or ID-style username (simple heuristic)
    const phoneCN = /^\+?86?\s?[-()0-9\s]{6,}$/; // tolerant
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const idLike = /^[a-zA-Z0-9._-]{3,64}$/;
    return phoneCN.test(s) || email.test(s) || idLike.test(s);
  }

  const canSubmit = (scanQr || isValidRecipient(recipient)) && Number.isFinite(amt) && amt > 0;

  /* -------------------------------------------------------------------------- */
  /* Actions                                                                     */
  /* -------------------------------------------------------------------------- */
  async function handleCreate() {
    setError(null);

    if (!scanQr && !isValidRecipient(recipient)) {
      setError("Enter recipient (Alipay ID/phone) or enable QR.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    // soft guard when exceeding visible balance
    if (amt > balance) {
      const ok = confirm(
        `Amount exceeds your visible ${payFrom} balance (${fmt(balance)}). Continue anyway?`
      );
      if (!ok) return;
    }

    try {
      setBusy(true);

      // 1) Create transfer (server enqueues admin review and issues OTP)
      // Backend expects: { fromAccount, recipient, amount, note, viaQr }
      const res = await createAlipay({
        fromAccount: payFrom,
        recipient: scanQr ? undefined : recipient.trim(),
        amount: +amt.toFixed(2), // dollars as number; server converts to cents
        note: note || undefined,
        viaQr: !!scanQr,
      });

      const ref =
        (res as any)?.referenceId ||
        "ALI-" + Math.random().toString(36).slice(2, 10).toUpperCase();

      setReferenceId(ref);
      setServerCreate(res);

      // 2) Minimal local fallback for Pending page (OTP_REQUIRED state)
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: (res as any)?.status || "OTP_REQUIRED",
            rail: "alipay",
            createdAt: (res as any)?.createdAt || new Date().toISOString(),
            etaText: (res as any)?.eta || "Usually instant",
            amount: { value: +amt.toFixed(2), currency: "USD" },
            fees:
              (res as any)?.fees ??
              { app: 0, currency: "USD" },
            sender: { accountName: payFrom },
            recipient: {
              name: scanQr ? "QR recipient" : recipient.trim(),
              tag: scanQr ? "QR" : undefined,
            },
            referenceId: ref,
            note: note || undefined,
            cancelable: true,
          })
        );
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      // 3) Open OTP sheet
      setOtp("");
      setOtpStep("waiting");
      setOtpOpen(true);
    } catch (e: any) {
      setError(e?.message || "Failed to create transfer.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp() {
    if (!referenceId) return;
    const code = otp.replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code we sent.");
      return;
    }
    try {
      setError(null);
      setOtpStep("verifying");

      await verifyTransferOtp(referenceId, code);

      // Hand off to the universal Pending page with a real ?ref=
      afterCreateTransfer(router, {
        ...(serverCreate || {}),
        referenceId,
        rail: "alipay",
        amount: { value: +amt.toFixed(2), currency: "USD" },
        sender: { accountName: payFrom },
        recipient: { name: scanQr ? "QR recipient" : recipient.trim() },
        note,
        status: "PENDING_ADMIN",
      });
      // (afterCreateTransfer pushes to /Transfer/pending?ref=...)
    } catch (e: any) {
      setError(e?.message || "OTP verification failed.");
      setOtpStep("waiting");
    }
  }

  /* -------------------------------------------------------------------------- */
  /* UI                                                                          */
  /* -------------------------------------------------------------------------- */
  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={isHydrated ? userName : "User"} />
      <section className="pt-[120px] container-x pb-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Send to Alipay</h1>

          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/20 space-y-4">
            {/* From account */}
            <div>
              <label className="text-sm text-white/70">Pay from</label>
              <select
                value={payFrom}
                onChange={(e) => setPayFrom(e.target.value as AccountName)}
                className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 mt-1"
              >
                <option value="Checking" suppressHydrationWarning>
                  Checking — {USD_FMT.format(isHydrated ? checking : 0)}
                </option>
                <option value="Savings" suppressHydrationWarning>
                  Savings — {USD_FMT.format(isHydrated ? savings : 0)}
                </option>
              </select>
            </div>

            {/* Recipient toggle */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scanQr}
                  onChange={(e) => setScanQr(e.target.checked)}
                />
                <span className="text-white/70">Use recipient QR</span>
              </label>
            </div>

            {/* Recipient input or QR block */}
            {!scanQr ? (
              <div>
                <label className="text-sm text-white/70">Recipient Alipay ID / phone</label>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="alipay_id • name@email.com • +86 138 0000 0000"
                  className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 mt-1"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-white/20 p-6 text-center bg-white/[0.02]">
                <div className="mx-auto mb-3 w-24 h-24 grid place-items-center rounded-lg bg-white/10">
                  <QrCode />
                </div>
                <div className="text-sm text-white/60">
                  QR scan enabled. (In production, send scanned payload to the backend.)
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="text-sm text-white/70">Amount (USD)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => {
                  const n = Number(String(amount).replace(/[,$\s]/g, "")) || 0;
                  setAmount(NUM2_FMT.format(n));
                }}
                className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 mt-1"
                inputMode="decimal"
                placeholder="0.00"
              />
              <div className="text-xs text-white/50 mt-1">
                Available in {payFrom}: {fmt(balance)}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-sm text-white/70">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-2xl bg-white/10 border border-white/20 px-3 py-3 mt-1"
                placeholder="Payment note"
              />
            </div>

            {/* Error */}
            {error && <div className="text-xs text-rose-300">{error}</div>}

            {/* CTA */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCreate}
                disabled={busy || !canSubmit}
                className={`px-4 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                  !canSubmit ? "opacity-60 cursor-not-allowed" : ""
                }`}
                style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {busy ? "Submitting…" : "Send to Alipay"}
              </button>
              <button
                onClick={() => router.push("/Transfer")}
                className="px-4 py-3 rounded-2xl bg-white/10 border border-white/20"
              >
                Cancel
              </button>
            </div>

            <div className="text-xs text-white/60 pt-1">
              You’ll confirm with a one-time passcode (OTP). The transfer stays{" "}
              <span className="text-white">Pending</span> until an admin approves it.
            </div>
          </div>
        </div>
      </section>

      {/* OTP Drawer */}
      {otpOpen && (
        <div className="fixed inset-0 z-[90]" onClick={() => setOtpOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-[#0F1622] border-l border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
              <h3 className="font-semibold">Verify with OTP</h3>
              <button
                className="h-10 w-10 rounded-2xl hover:bg-white/15"
                onClick={() => setOtpOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-6 grid gap-4">
              <label className="text-sm grid gap-2">
                <span className="text-white/70">Enter the 6-digit code</span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 font-mono tracking-widest"
                  placeholder="••••••"
                />
              </label>
              {error && <div className="text-xs text-rose-300">{error}</div>}
              <button
                disabled={otpStep === "verifying" || otp.replace(/\D/g, "").length !== 6 || !referenceId}
                onClick={confirmOtp}
                className="px-5 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)]"
                style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
              >
                {otpStep === "verifying" ? "Verifying…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
