// app/Transfer/wechat/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/app/dashboard/dashboardnav";
import {
  ArrowLeft,
  User,
  Hash,
  DollarSign,
  FileText,
  Shield,
  Building2,
} from "lucide-react";
import API, {
  createWeChat,
  afterCreateTransfer,
  verifyTransferOtp,
} from "@/libs/api";

export default function WeChatPayPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");

  // form state
  const [recipientName, setRecipientName] = useState("");
  const [wechatId, setWeChatId] = useState("");
  const [amount, setAmount] = useState("50.00");
  const [note, setNote] = useState("");

  // pay-from + balances
  const [payFrom, setPayFrom] = useState<"Checking" | "Savings">("Checking");
  const [checking, setChecking] = useState(5023.75);
  const [savings, setSavings] = useState(8350.2);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("hb_user_name") || "User");
      setChecking(Number(localStorage.getItem("hb_acc_checking_bal") || 5023.75));
      setSavings(Number(localStorage.getItem("hb_acc_savings_bal") || 8350.2));
    }
  }, []);

  const amt = Number(String(amount).replace(/[,$\s]/g, ""));
  const canSubmit =
    recipientName.trim().length >= 2 &&
    wechatId.trim().length >= 3 &&
    amt > 0 &&
    amt <= (payFrom === "Checking" ? checking : savings);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD" });

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      // 1) Create the transfer — match backend shape exactly:
      // { fromAccount, recipientName, wechatId, amount, note }
      const res: any = await createWeChat({
        fromAccount: payFrom,
        recipientName: recipientName.trim(),
        wechatId: wechatId.trim(),
        amount: +amt.toFixed(2),
        note: note || undefined,
      });

      const referenceId =
        res?.referenceId ||
        "WCP-" + Math.random().toString(36).slice(2, 10).toUpperCase();

      // 2) Save a local snapshot so Pending can render even if network hiccups
      try {
        localStorage.setItem(
          "last_transfer",
          JSON.stringify({
            status: res?.status || "OTP_REQUIRED",
            rail: "wechat",
            createdAt: res?.createdAt || new Date().toISOString(),
            amount: { value: +amt.toFixed(2), currency: "USD" },
            sender: { accountName: payFrom },
            recipient: { name: `${recipientName.trim()} (${wechatId.trim()})` },
            referenceId,
            note: note || undefined,
            cancelable: true,
          })
        );
        localStorage.setItem("hb_open_txn", "1");
      } catch {}

      // 3) Collect and verify OTP **against this transfer reference**
      const code = (window.prompt("Enter the 6-digit OTP to confirm this WeChat transfer:") || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (code.length !== 6) {
        throw new Error("Invalid code. Please enter the 6-digit OTP.");
      }

      await verifyTransferOtp(referenceId, code);

      // 4) Hand off to the universal Pending page (saves/normalizes and routes with ?ref=)
      afterCreateTransfer(router, {
        ...res,
        referenceId,
        rail: "wechat",
        recipient: { name: `${recipientName.trim()} (${wechatId.trim()})` },
        note,
        status: "PENDING_ADMIN",
      });
    } catch (e: any) {
      alert(e?.message || "Failed to start transfer");
    } finally {
      setLoading(false);
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
            ▸ <span className="text-white/80">WeChat Pay</span>
          </div>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="mt-4 rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#07C160]/15 border border-[#07C160]/40 grid place-items-center text-[#07C160] font-semibold">
                W
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">WeChat Pay transfer</h1>
                <p className="text-white/70 text-sm mt-1">Send funds to a WeChat Pay wallet.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Field label="Recipient name" icon={<User size={14} />}>
                <input
                  className="input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </Field>

              <Field label="WeChat ID" icon={<Hash size={14} />}>
                <input
                  className="input"
                  value={wechatId}
                  onChange={(e) => setWeChatId(e.target.value)}
                />
              </Field>

              <Field label="Amount (USD)" icon={<DollarSign size={14} />}>
                <input
                  className="input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => {
                    const n = Number(String(amount).replace(/[,$\s]/g, ""));
                    if (isFinite(n))
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

              <Field label="Pay from" icon={<Building2 size={14} />}>
                <select
                  className="input"
                  value={payFrom}
                  onChange={(e) => setPayFrom(e.target.value as any)}
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
                  placeholder="e.g., invoice #8421"
                />
              </Field>
            </div>

            <div className="mt-4 text-xs text-white/60 flex items-center gap-2">
              <Shield size={14} /> OTP verification required. You’ll be notified when this transfer is
              reviewed and approved.
            </div>

            <button
              className={`btn-primary mt-5 ${!canSubmit || loading ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              {loading ? "Submitting…" : `Send ${fmt(amt)} via WeChat Pay`}
            </button>
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
