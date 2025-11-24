// app/dashboard/support/page.tsx
"use client";

import React, { useMemo, useState, type ReactNode } from "react";
import Nav from "@/app/dashboard/dashboardnav";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  Landmark,
  Clock3,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Search,
  SendHorizonal,
  FileText,
} from "lucide-react";

const SUPPORT_EMAIL = "Horizonbankhelpdesk@gmail.com";
const SUPPORT_PHONE_DISPLAY = "+1 (763) 319-4582";
const SUPPORT_PHONE_TEL = "+17633194582";

type Topic =
  | "Deposits & Add Money"
  | "Transfers"
  | "Cards"
  | "Account & KYC"
  | "Security"
  | "Other";

type Priority = "Normal" | "High" | "Urgent";

const TOPICS: { value: Topic; label: string; icon: ReactNode }[] = [
  { value: "Deposits & Add Money", label: "Deposits & Add Money", icon: <Landmark className="h-4 w-4" /> },
  { value: "Transfers", label: "Transfers", icon: <SendHorizonal className="h-4 w-4" /> },
  { value: "Cards", label: "Cards", icon: <CreditCard className="h-4 w-4" /> },
  { value: "Account & KYC", label: "Account & KYC", icon: <FileText className="h-4 w-4" /> },
  { value: "Security", label: "Security", icon: <ShieldCheck className="h-4 w-4" /> },
  { value: "Other", label: "Other", icon: <MessageCircle className="h-4 w-4" /> },
];

const PRIORITIES: Priority[] = ["Normal", "High", "Urgent"];

const FAQS = [
  {
    topic: "Deposits & Add Money" as Topic,
    q: "My deposit is pending. What happens next?",
    a: "Deposits go through OTP verification first, then enter an admin approval queue. Once approved, your balance updates and you’ll get a notification.",
  },
  {
    topic: "Deposits & Add Money" as Topic,
    q: "Why can’t I use ACH yet?",
    a: "ACH deposits require a verified linked bank. Finish linking in Onboarding → Wallets. Until then, debit card and wire deposits work.",
  },
  {
    topic: "Transfers" as Topic,
    q: "My transfer is stuck on pending.",
    a: "Pending transfers are awaiting internal checks or admin approval. If it’s been more than a few hours, contact support with the reference ID.",
  },
  {
    topic: "Cards" as Topic,
    q: "Can I freeze my card?",
    a: "Yes. Go to Cards in your dashboard and toggle Freeze Card. Frozen cards won’t approve new charges.",
  },
  {
    topic: "Account & KYC" as Topic,
    q: "How do I update my profile info?",
    a: "Open Settings / Profile in your dashboard to edit personal details. Some fields may require re-verification.",
  },
  {
    topic: "Security" as Topic,
    q: "I think my account was accessed. What should I do?",
    a: "Change your password right away, enable OTP login if available, and contact support so we can secure the account.",
  },
];

export default function SupportPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Ticket form state
  const [topic, setTopic] = useState<Topic>("Deposits & Add Money");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [refId, setRefId] = useState("");
  const [sending, setSending] = useState(false);

  const filteredFaqs = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return FAQS;
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(s) ||
        f.a.toLowerCase().includes(s) ||
        f.topic.toLowerCase().includes(s)
    );
  }, [search]);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    try {
      const bodyLines = [
        `Topic: ${topic}`,
        `Priority: ${priority}`,
        refId.trim() ? `Reference ID: ${refId.trim()}` : null,
        "",
        message.trim(),
        "",
        "— Sent from Horizon Support page",
      ].filter(Boolean);

      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        `[Horizon Support] ${subject.trim()}`
      )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

      // Open user's email client
      window.location.href = mailto;

      // Soft reset for UX
      setSubject("");
      setMessage("");
      setRefId("");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName="Support" />

      <section className="pt-[100px] container-x pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Back */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/dashboard/dashboard"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" /> Back to dashboard
            </Link>
          </div>

          {/* Hero / main card */}
          <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-[#101826] to-[#0B0F14] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold">Horizon Support</h1>
                <p className="text-white/70 mt-1">
                  We’re here to help. Browse quick fixes or message the Helpdesk.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-4 py-2 text-sm hover:bg-white/[0.08]"
                >
                  <Mail className="h-4 w-4" />
                  Email Helpdesk
                </a>
                <a
                  href={`tel:${SUPPORT_PHONE_TEL}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-4 py-2 text-sm hover:bg-white/[0.08]"
                >
                  <Phone className="h-4 w-4" />
                  Call {SUPPORT_PHONE_DISPLAY}
                </a>
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <QuickCard
                icon={<Landmark className="h-4 w-4" />}
                title="Add money help"
                text="ACH, card, wire deposits and pending approvals."
                href="/dashboard/money/add"
              />
              <QuickCard
                icon={<Clock3 className="h-4 w-4" />}
                title="Pending transfers"
                text="Track approvals and references."
                href="/Transfer/pending"
              />
              <QuickCard
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Security center"
                text="Account protection and suspicious activity."
                href="/dashboard/security"
              />
            </div>

            {/* Notice */}
            <div className="mt-4 rounded-2xl border border-white/20 bg-white/[0.04] p-4 text-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-amber-200">Include a reference ID when possible</div>
                <div className="text-white/80 mt-1">
                  If your issue relates to a deposit or transfer, paste the reference ID so we can resolve it faster.
                </div>
              </div>
            </div>
          </div>

          {/* Search + FAQ */}
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            {/* FAQ */}
            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Quick answers</h2>
                <div className="relative w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search help…"
                    className="w-full rounded-2xl bg-white/10 border border-white/20 pl-9 pr-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {filteredFaqs.length === 0 && (
                  <div className="text-sm text-white/70 py-6 text-center">
                    No results. Try another keyword.
                  </div>
                )}

                {filteredFaqs.map((f, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <AccordionItem
                      key={`${f.topic}-${i}`}
                      open={isOpen}
                      onToggle={() => setOpenFaq(isOpen ? null : i)}
                      title={f.q}
                      badge={f.topic}
                    >
                      {f.a}
                    </AccordionItem>
                  );
                })}
              </div>

              <div className="mt-4 text-xs text-white/60">
                Still stuck? Send a ticket and we’ll respond ASAP.
              </div>
            </div>

            {/* Ticket form */}
            <div className="rounded-3xl border border-white/20 bg-white/[0.04] p-5 md:p-6">
              <h2 className="text-base font-semibold">Contact Helpdesk</h2>
              <p className="text-sm text-white/70 mt-1">
                Tell us what’s up. This opens your email app with a pre-filled message.
              </p>

              <form className="mt-4 grid gap-4" onSubmit={submitTicket}>
                <FieldSelect
                  label="Topic"
                  value={topic}
                  onChange={(v) => setTopic(v as Topic)}
                  options={TOPICS.map((t) => ({ value: t.value, label: t.label }))}
                  icon={TOPICS.find((t) => t.value === topic)?.icon}
                />

                <FieldSelect
                  label="Priority"
                  value={priority}
                  onChange={(v) => setPriority(v as Priority)}
                  options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                  icon={<AlertTriangle className="h-4 w-4" />}
                />

                <FieldInput
                  label="Subject"
                  value={subject}
                  onChange={setSubject}
                  placeholder="e.g. Deposit pending too long"
                  icon={<MessageCircle className="h-4 w-4" />}
                />

                <FieldInput
                  label="Reference ID (optional)"
                  value={refId}
                  onChange={setRefId}
                  placeholder="e.g. ADD-8F3K2A"
                  icon={<FileText className="h-4 w-4" />}
                />

                <FieldTextArea
                  label="Describe the issue"
                  value={message}
                  onChange={setMessage}
                  placeholder="What happened? When? Any screenshots or details?"
                />

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-white/60">
                    Or email directly:{" "}
                    <a className="underline hover:text-white" href={`mailto:${SUPPORT_EMAIL}`}>
                      {SUPPORT_EMAIL}
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !subject.trim() || !message.trim()}
                    className={`px-5 py-3 rounded-2xl text-[#0B0F14] shadow-[0_12px_32px_rgba(0,180,216,.35)] ${
                      sending || !subject.trim() || !message.trim()
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                    style={{ backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)" }}
                  >
                    {sending ? "Opening email…" : "Send to Helpdesk"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer-ish */}
          <div className="mt-8 text-center text-xs text-white/50">
            © {new Date().getFullYear()} Horizon Bank • Support line available 24/7 for urgent issues.
          </div>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------- UI blocks ------------------------------- */

function QuickCard({
  icon,
  title,
  text,
  href,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/20 bg-white/[0.06] p-4 hover:bg-white/[0.08] transition"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium flex items-center gap-2">
            {title}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </div>
          <div className="text-xs text-white/70 mt-1">{text}</div>
        </div>
      </div>
    </Link>
  );
}

function AccordionItem({
  open,
  onToggle,
  title,
  badge,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div>
          <div className="text-sm font-medium">{title}</div>
          {badge && <div className="text-xs text-white/60 mt-0.5">{badge}</div>}
        </div>
        <ChevronDown
          className={`h-4 w-4 opacity-80 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-white/80 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

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

function FieldTextArea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { label, value, onChange, placeholder, disabled } = props;
  return (
    <label className="text-sm grid gap-2">
      <span className="text-white/70">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={6}
        className="w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-base shadow-inner resize-none"
      />
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
          className={`w-full rounded-2xl bg-white/10 border border-white/20 ${
            icon ? "pl-10" : "pl-3"
          } pr-4 py-3 text-base shadow-inner`}
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
