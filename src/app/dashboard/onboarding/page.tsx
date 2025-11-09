// app/dashboard/onboarding/page.tsx
// Horizon — After-Signup Onboarding Wizard (Manual ACH + Wallets, Backend-Persisted)
//
// Server contract (already wired on your backend):
//   POST   /api/users/me/security                  -> { pin?, passkey? }
//   PATCH  /api/users/me/profile                   -> { firstName?, lastName?, dob?, address?, avatarUrl?, phone?, handle? }
//   POST   /api/users/me/accounts                  -> { checking?:bool, savings?:bool, virtualCard?:bool } -> { accountNumber?, routingNumber?, cardNumber? }
//   POST   /api/users/me/wallets                   -> { btcAddress? }
//   DELETE /api/users/me/wallets/:symbol
//   POST   /api/users/me/ach/manual                -> { holder, bankName, type, routing, accountNumber, consent:true }
//   POST   /api/users/me/ach/verify                -> { amounts:[n1,n2] }
//   DELETE /api/users/me/ach
//   PATCH  /api/users/me/preferences               -> { timezone?, currency?, notifyEmail?, notifyPush? }
//   PATCH  /api/users/me                            -> { onboardingStep?:number }
//   POST   /api/users/me/onboarding/complete
//
// Optional pre-auth mirrors (only if you implemented them):
//   POST   /api/auth/onboarding/security
//   PATCH  /api/auth/onboarding/profile
//   POST   /api/auth/onboarding/accounts
//   POST   /api/auth/onboarding/wallets
//   POST   /api/auth/onboarding/ach/manual
//   POST   /api/auth/onboarding/ach/verify
//   DELETE /api/auth/onboarding/ach
//   PATCH  /api/auth/onboarding/preferences
//   PATCH  /api/auth (onboardingStep)
//   POST   /api/auth/onboarding/complete

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  ShieldCheck,
  CreditCard,
  PiggyBank,
  LayoutGrid,
  Bitcoin,
  Landmark,
} from "lucide-react";
import { registerThisDevice } from "@/libs/fp";

/* --------------------------------------------------------------------------
   Steps:
     0. Security
     1. Profile
     2. Accounts
     3. Wallets & ACH
     4. Preferences
     5. Finish
---------------------------------------------------------------------------- */

type AchStatus = "none" | "verifying" | "pending_verification" | "verified" | "failed";

/* ------------------------------ API helpers ------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
async function req<T = any>(
  path: string,
  opts: { method?: Method; body?: any; headers?: HeadersInit } = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
    credentials: "include",
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data as T;
}

/* --------------------------------- Page ---------------------------------- */

export default function OnboardingPage() {
  const router = useRouter();

  // Auth state: true = session cookie works; false = pre-auth (using regId); null = unknown
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Persist regId for pre-auth flows (kept in sessionStorage)
  const [regId, setRegId] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const q = u.searchParams.get("reg") || sessionStorage.getItem("regId") || "";
    if (q) {
      setRegId(q);
      sessionStorage.setItem("regId", q);
    }
  }, []);

  // Endpoint mapper (mirrors /auth/onboarding/* only if you implemented those on BE)
  const ep = (p: string) => {
    if (authed) return p; // use /users/me/* endpoints
    // Pre-auth: redirect to your /auth/onboarding/* endpoints (if they exist)
    const stripped = p.replace(/^\/users\/me/, ""); // e.g. "/security" or "/onboarding/complete"
    return stripped.startsWith("/onboarding")
      ? `/auth${stripped}` // "/auth/onboarding/complete"
      : `/auth/onboarding${stripped}`; // "/auth/onboarding/security"
  };

  const withReg = (headers?: HeadersInit): HeadersInit =>
    !authed && regId ? { ...(headers || {}), "X-Registration-Id": regId } : headers || {};

  const reqA = <T = any,>(
    p: string,
    opts: { method?: Method; body?: any; headers?: HeadersInit } = {}
  ) => {
    if (!authed && !regId) throw new Error("Missing registration id. Please restart signup.");
    return req<T>(ep(p), { ...opts, headers: withReg(opts.headers) });
  };

  // Wizard state
  const [step, setStep] = useState(0);
  const totalSteps = 6;
  const pct = Math.round(((step + (step === totalSteps - 1 ? 1 : 0)) / totalSteps) * 100);

  // Security
  const [pin, setPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [phone, setPhone] = useState("");
  const [handle, setHandle] = useState("");

  // Accounts
  const [hasChecking, setHasChecking] = useState(false);
  const [hasSavings, setHasSavings] = useState(false);
  const [hasVirtualCard, setHasVirtualCard] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");

  // Wallets / External
  const [btcWallet, setBtcWallet] = useState("");

  // ACH manual link state (mirrors BE `user.ach`)
  const [achStatus, setAchStatus] = useState<AchStatus>("none");
  const [achBankName, setAchBankName] = useState("");
  const [achMask, setAchMask] = useState("");
  const [achHolder, setAchHolder] = useState("");

  // Preferences
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [currency, setCurrency] = useState("USD");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  // UI
  const [toast, setToast] = useState("");
  const [isMobile, setIsMobile] = useState(true);

  // Prefill from backend (only if authed)
  useEffect(() => {
    (async () => {
      try {
        const me = await req<{
          id: string;
          firstName?: string;
          lastName?: string;
          address?:
            | { street1?: string; city?: string; state?: string; postalCode?: string; country?: string }
            | string;
          dob?: string;
          passkeyEnabled?: boolean;
          hasPin?: boolean;
          onboardingStatus?: string;
          setupPercent?: number;
          accounts?: { accountNumber?: string; routingNumber?: string; cardNumber?: string } | null;
          ach?: {
            status: AchStatus;
            bankName?: string;
            mask?: string;
            holder?: string;
          } | null;
          preferences?: {
            timezone?: string;
            currency?: string;
            notifyEmail?: boolean;
            notifyPush?: boolean;
          } | null;
          phone?: string;
          handle?: string;
        }>("/users/me");

        setAuthed(true);

        // Security flags
        setHasPin(!!me?.hasPin);
        setBiometricEnabled(!!me?.passkeyEnabled);

        // Profile
        if (me?.firstName) setFirstName(me.firstName);
        if (me?.lastName) setLastName(me.lastName);
        if (me?.dob) setDob(String(me.dob).slice(0, 10));
        if (typeof me?.address === "string") {
          setAddress(me.address);
        } else if (me?.address) {
          const a = me.address as any;
          setAddress([a.street1, a.city, a.state, a.postalCode].filter(Boolean).join(", "));
        }
        if (me?.phone) setPhone(me.phone);
        if (me?.handle) setHandle(me.handle);

        // Accounts snapshot
        if (me?.accounts) {
          if (me.accounts.accountNumber) {
            setAccountNumber(me.accounts.accountNumber);
            setHasChecking(true);
          }
          if (me.accounts.cardNumber) {
            setCardNumber(me.accounts.cardNumber);
            setHasVirtualCard(true);
          }
          if (me.accounts.routingNumber) {
            setRoutingNumber(me.accounts.routingNumber);
          }
        }

        // ACH
        if (me?.ach) {
          setAchStatus(me.ach.status || "none");
          setAchBankName(me.ach.bankName || "");
          setAchMask(me.ach.mask || "");
          setAchHolder(me.ach.holder || "");
        }

        // Preferences
        if (me?.preferences) {
          if (me.preferences.timezone) setTimezone(me.preferences.timezone);
          if (me.preferences.currency) setCurrency(me.preferences.currency);
          if (me.preferences.notifyEmail != null) setNotifyEmail(!!me.preferences.notifyEmail);
          if (me.preferences.notifyPush != null) setNotifyPush(!!me.preferences.notifyPush);
        }
      } catch {
        // First-time onboarding: no session yet → stay on page in pre-auth mode
        setAuthed(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // Guard to enable Next button
  const canNext = useMemo(() => {
    if (step === 0) return hasPin || pin.length >= 4; // if already has PIN, ok; else need 4–6
    if (step === 1) return !!(firstName && lastName && address && dob);
    if (step === 2) return hasChecking || hasSavings || hasVirtualCard;
    if (step === 3) {
      // Require either BTC or ACH to be provided (not strictly both)
      const btcOk = btcWallet.trim().length >= 15;
      const achOk = achStatus === "pending_verification" || achStatus === "verified";
      return btcOk || achOk;
    }
    return true;
  }, [
    step,
    hasPin,
    pin,
    firstName,
    lastName,
    address,
    dob,
    hasChecking,
    hasSavings,
    hasVirtualCard,
    btcWallet,
    achStatus,
  ]);

  /* ----------------------------- Step actions ----------------------------- */

  const onNextPersist = async () => {
    try {
      // 0) Security
      if (step === 0) {
        const body: any = {};
        if (!hasPin && pin) body.pin = pin;
        body.passkey = biometricEnabled === true;
        if (Object.keys(body).length) {
          await reqA("/users/me/security", { method: "POST", body });
          if (pin) setHasPin(true);
        }
      }

      // 1) Profile
      if (step === 1) {
        await reqA("/users/me/profile", {
          method: "PATCH",
          body: {
            firstName: firstName?.trim(),
            lastName: lastName?.trim(),
            address: { street1: address?.trim() }, // single-line -> server stores AddressSchema
            dob: dob ? new Date(dob).toISOString() : undefined,
            avatarUrl: profilePic || undefined,
            phone: phone?.trim() || undefined,
            handle: (handle || "").replace(/^@/, "").trim() || undefined,
          },
        });
      }

      // 2) Accounts/cards (server generates demo numbers)
      if (step === 2) {
        const res = await reqA<{ accountNumber?: string; routingNumber?: string; cardNumber?: string }>(
          "/users/me/accounts",
          {
            method: "POST",
            body: { checking: hasChecking, savings: hasSavings, virtualCard: hasVirtualCard },
          }
        );
        if (res?.accountNumber) setAccountNumber(res.accountNumber);
        if (res?.routingNumber) setRoutingNumber(res.routingNumber);
        if (res?.cardNumber) setCardNumber(res.cardNumber);
      }

      // 3) Wallets & ACH
      if (step === 3) {
        // BTC wallet (optional)
        if (btcWallet.trim()) {
          await reqA("/users/me/wallets", {
            method: "POST",
            body: { btcAddress: btcWallet.trim() },
          }).catch(() => {});
        }
        // ACH flow is handled inside ManualAchCard; no extra call needed here
      }

      // 4) Preferences
      if (step === 4) {
        await reqA("/users/me/preferences", {
          method: "PATCH",
          body: { timezone, currency, notifyEmail, notifyPush },
        });
      }

      // Progress bump (best-effort)
      await reqA("/users/me", { method: "PATCH", body: { onboardingStep: step + 1 } }).catch(() => {});
      next();
    } catch (e: any) {
      setToast(e?.message || "Something went wrong. Please try again.");
      setTimeout(() => setToast(""), 3000);
    }
  };

  const complete = async () => {
    try {
      await reqA("/users/me/onboarding/complete", { method: "POST" }).catch(() => {});
      setAuthed(true);
    } finally {
      router.replace("/dashboard/dashboard");
    }
  };

  const enrollBiometric = async () => {
    try {
      setEnrolling(true);
      // In production: start WebAuthn ceremony then POST credential
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await reqA("/users/me/security", { method: "POST", body: { passkey: true } });
      try {
        await registerThisDevice({ type: "passkey" });
      } catch {}
      setBiometricEnabled(true);
      setEnrollSuccess(true);
      setTimeout(() => setEnrollSuccess(false), 1600);
    } catch (e: any) {
      setToast(e?.message || "Could not enable biometric/passkey.");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setEnrolling(false);
    }
  };

  // ACH child state handler (kept local; BE is source of truth)
  function handleAchStateUpdate(
    nextState: Partial<{
      status: AchStatus;
      bankName: string;
      mask: string;
      holder: string;
    }>
  ) {
    if (nextState.status) setAchStatus(nextState.status);
    if (nextState.bankName !== undefined) setAchBankName(nextState.bankName);
    if (nextState.mask !== undefined) setAchMask(nextState.mask);
    if (nextState.holder !== undefined) setAchHolder(nextState.holder);
  }

  return (
    <main
      className="min-h-svh bg-[#0B0F14] text-white"
      style={{
        backgroundImage:
          "radial-gradient(900px 500px at 10% -10%, rgba(0,224,255,0.12), transparent 60%), radial-gradient(700px 400px at 90% 110%, rgba(0,180,216,0.10), transparent 60%)",
      }}
    >
      <section className="container-x pt-[12vh] pb-12">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Let’s set things up</h1>
            <p className="text-white/70 mt-1">Complete the setup to get your digital account running.</p>
          </div>
          <ProgressRing value={pct} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-[12px] text-white/80">
          {["Security", "Profile & ID", "Accounts", "Wallets", "Preferences", "Finish"].map(
            (k, i) => (
              <span
                key={k}
                className={`px-3 py-1.5 rounded-full border ${
                  i === step ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"
                }`}
              >
                {k}
              </span>
            )
          )}
        </div>

        <div className="mt-8">
          {/* Step 0 – Security */}
          {step === 0 && (
            <Panel title="Security" subtitle="Create your PIN and enable a quick sign-in method.">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <label className="text-sm text-white/80">
                    {hasPin ? "Update App PIN (optional)" : "Create a 4–6 digit App PIN"}
                  </label>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3 tracking-[.4em] text-center text-lg"
                    placeholder="••••••"
                  />
                  {!hasPin && pin.length > 0 && pin.length < 4 && (
                    <p className="text-xs text-yellow-400 mt-1">Enter at least 4 digits.</p>
                  )}
                  <p className="text-xs text-white/50 mt-1">Keep your PIN secret.</p>
                </div>

                {isMobile && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2">
                      <Fingerprint size={18} className="opacity-80" />
                      <div className="text-sm">Quick sign-in</div>
                    </div>
                    <button
                      onClick={enrollBiometric}
                      disabled={enrolling || biometricEnabled}
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${
                        biometricEnabled || enrolling
                          ? "bg-emerald-400/20 border border-emerald-400/40"
                          : "bg-white/10 border border-white/20"
                      }`}
                    >
                      <ShieldCheck size={16} /> {enrolling ? "Enrolling..." : biometricEnabled ? "Enabled" : "Enable"}
                    </button>
                    <p className="text-xs text-white/50 mt-1">Uses your device’s secure authenticator.</p>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Step 1 – Profile & ID */}
          {step === 1 && (
            <Panel title="Profile & ID" subtitle="Upload your picture and fill in personal details.">
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Profile photo">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setProfilePic(url);
                    }}
                  />
                  {profilePic && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePic}
                      alt="preview"
                      className="mt-3 w-24 h-24 rounded-xl object-cover border border-white/10"
                    />
                  )}
                </Field>
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  />
                </Field>
                <Field label="Address">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  />
                </Field>
                <Field label="Date of birth">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  />
                </Field>
                <Field label="Handle">
                  <input
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  />
                </Field>
              </div>
            </Panel>
          )}

          {/* Step 2 – Account setup */}
          {step === 2 && (
            <Panel title="Account Setup" subtitle="Choose your account types and get a digital card.">
              <div className="grid sm:grid-cols-3 gap-6">
                <SelectableCard
                  active={hasChecking}
                  onToggle={() => setHasChecking((v: boolean) => !v)}
                  icon={<LayoutGrid size={18} />}
                  title="Checking account"
                  subtitle="Instant spending account"
                />
                <SelectableCard
                  active={hasSavings}
                  onToggle={() => setHasSavings((v: boolean) => !v)}
                  icon={<PiggyBank size={18} />}
                  title="Savings"
                  subtitle="Earn and track goals"
                />
                <SelectableCard
                  active={hasVirtualCard}
                  onToggle={() => setHasVirtualCard((v: boolean) => !v)}
                  icon={<CreditCard size={18} />}
                  title="Virtual card"
                  subtitle="Online purchases and limits"
                />
              </div>

              {(accountNumber || cardNumber) && (
                <div className="mt-6 text-sm text-white/70 space-y-1">
                  {routingNumber && (
                    <p>
                      <strong>Routing:</strong> {routingNumber}
                    </p>
                  )}
                  {accountNumber && (
                    <p>
                      <strong>Account No:</strong> {accountNumber}
                    </p>
                  )}
                  {cardNumber && (
                    <p>
                      <strong>Card No:</strong> {cardNumber}
                    </p>
                  )}
                </div>
              )}
            </Panel>
          )}

          {/* Step 3 – Wallets & External (Manual ACH Only) */}
          {step === 3 && (
            <Panel title="Wallets & External Accounts" subtitle="Link your crypto and external funding methods.">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* BTC */}
                <Field label="Bitcoin Wallet Address">
                  <div className="relative">
                    <Bitcoin className="absolute left-3 top-3 text-white/30" size={16} />
                    <input
                      value={btcWallet}
                      onChange={(e) => setBtcWallet(e.target.value)}
                      placeholder="Your BTC wallet address"
                      className="pl-9 mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                    />
                  </div>
                </Field>

                {/* Manual ACH Card */}
                <ManualAchCard
                  authed={!!authed}
                  regId={regId}
                  status={achStatus}
                  bankName={achBankName}
                  mask={achMask}
                  holder={achHolder}
                  onStateChange={handleAchStateUpdate}
                />
              </div>
            </Panel>
          )}

          {/* Step 4 – Preferences */}
          {step === 4 && (
            <Panel title="Preferences" subtitle="Set currency, timezone, and notifications.">
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Timezone">
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  />
                </Field>
                <Field label="Currency">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-3"
                  >
                    {["USD", "EUR", "GBP", "CAD", "NGN"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Notifications">
                  <div className="mt-2 flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                      />{" "}
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={notifyPush}
                        onChange={(e) => setNotifyPush(e.target.checked)}
                      />{" "}
                      Push
                    </label>
                  </div>
                </Field>
              </div>
            </Panel>
          )}

          {/* Step 5 – Finish */}
          {step === 5 && (
            <Panel title="All set" subtitle="Your Horizon account is ready to explore.">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center gap-3">
                <ShieldCheck className="text-emerald-400" />
                <div className="text-sm text-white/80">
                  Security and basics saved. You can modify these in Settings later.
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={step === 0 ? () => router.back() : prev}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            {step < 5 && (
              <button
                onClick={onNextPersist}
                disabled={!canNext}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium text-[#0B0F14] disabled:opacity-50"
                style={{
                  backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                  boxShadow: "0 10px 28px rgba(0,180,216,.35)",
                }}
              >
                Continue <ArrowRight size={16} />
              </button>
            )}
            {step === 5 && (
              <button
                onClick={complete}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium text-[#0B0F14]"
                style={{
                  backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                  boxShadow: "0 10px 28px rgba(0,180,216,.35)",
                }}
              >
                Go to dashboard <Check size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Biometric Enrollment Overlay */}
      {enrolling && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
          <Fingerprint size={100} className="text-[#00E0FF] animate-pulse" />
          <p className="mt-4 text-lg font-medium">Place your finger on the screen</p>
          <p className="mt-1 text-sm text-white/70">Scanning...</p>
        </div>
      )}

      {/* Enrollment Success Toast */}
      {enrollSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-emerald-400/20 border border-emerald-400/40 rounded-xl px-6 py-3 text-sm text-emerald-300">
          Biometric enrolled successfully!
        </div>
      )}

      {/* Error Toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-rose-500/15 border border-rose-500/30 rounded-xl px-6 py-3 text-sm text-rose-200">
          {toast}
        </div>
      )}
    </main>
  );
}

/* --------------------------- Manual ACH Card --------------------------- */

function ManualAchCard({
  authed,
  regId,
  status,
  bankName,
  mask,
  holder,
  onStateChange,
}: {
  authed: boolean;
  regId: string;
  status: AchStatus;
  bankName: string;
  mask: string;
  holder: string;
  onStateChange: (s: Partial<{ status: AchStatus; bankName: string; mask: string; holder: string }>) => void;
}) {
  // Form fields (not persisted until POST)
  const [name, setName] = useState(holder || "");
  const [bName, setBName] = useState(bankName || "");
  const [type, setType] = useState<"checking" | "savings" | "">("");
  const [routing, setRouting] = useState("");
  const [acct, setAcct] = useState("");
  const [acct2, setAcct2] = useState("");
  const [consent, setConsent] = useState(false);

  // Verification inputs
  const [dep1, setDep1] = useState("");
  const [dep2, setDep2] = useState("");

  const isRoutingValid = validateAba(routing);
  const isAcctValid = acct.length >= 6 && acct.length <= 17 && acct === acct2;
  const canSubmitManual =
    !!(name.trim().length >= 2 && bName.trim().length >= 2 && type && isRoutingValid && isAcctValid && consent);

  const showForm = status === "none" || status === "failed";
  const showLoading = status === "verifying";
  const showPending = status === "pending_verification";
  const showVerified = status === "verified";

  const base = authed ? "/users/me/ach" : "/auth/onboarding/ach";
  const hdrs: HeadersInit = authed
    ? { "Content-Type": "application/json" }
    : { "Content-Type": "application/json", "X-Registration-Id": regId };

  async function submitManual() {
    if (!canSubmitManual) return;
    try {
      const res = await fetch(`${API_BASE}${base}/manual`, {
        method: "POST",
        credentials: "include",
        headers: hdrs,
        body: JSON.stringify({
          holder: name,
          bankName: bName,
          type,
          routing,
          accountNumber: acct,
          consent: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to link account.");
      const masked = "••••" + acct.slice(-4);
      onStateChange({ status: "verifying", bankName: bName, mask: masked, holder: name });
      // Transition to pending for demo UX
      setTimeout(() => onStateChange({ status: "pending_verification" }), 1000);
    } catch {
      onStateChange({ status: "failed" });
    }
  }

  async function verifyDeposits() {
    const ok = Number(dep1) > 0 && Number(dep2) > 0;
    if (!ok) return;
    const res = await fetch(`${API_BASE}${base}/verify`, {
      method: "POST",
      credentials: "include",
      headers: hdrs,
      body: JSON.stringify({ amounts: [Number(dep1), Number(dep2)] }),
    });
    if (res.ok) onStateChange({ status: "verified" });
  }

  async function resendDeposits() {
    // Optional UX hint; server can re-initiate micro-deposits (noop in demo)
    await fetch(`${API_BASE}${base}/manual`, {
      method: "POST",
      credentials: "include",
      headers: hdrs,
    }).catch(() => {});
  }

  async function unlink() {
    await fetch(`${API_BASE}${base}`, {
      method: "DELETE",
      credentials: "include",
      headers: hdrs,
    }).catch(() => {});
    onStateChange({ status: "none", bankName: "", mask: "", holder: "" });
    setName("");
    setBName("");
    setType("");
    setRouting("");
    setAcct("");
    setAcct2("");
    setConsent(false);
    setDep1("");
    setDep2("");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2">
        <Landmark size={16} className="opacity-80" />
        <div className="text-sm font-medium">External bank (ACH)</div>
      </div>

      {showForm && (
        <div className="mt-4 grid gap-3 text-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <LabeledInput label="Account holder name" value={name} onChange={setName} placeholder="e.g., Madison Lee" />
            <LabeledInput label="Bank name" value={bName} onChange={setBName} placeholder="e.g., Chase" />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-white/70">Account type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
              >
                <option value="">Select</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/70">Routing number</label>
              <input
                inputMode="numeric"
                value={routing}
                onChange={(e) => setRouting(e.target.value.replace(/\D/g, "").slice(0, 9))}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
                placeholder="9 digits"
              />
              {!isRoutingValid && routing.length === 9 && (
                <p className="text-[11px] text-red-400 mt-1">Invalid ABA routing number.</p>
              )}
            </div>
            <div>
              <label className="text-xs text-white/70">Account number</label>
              <input
                inputMode="numeric"
                value={acct}
                onChange={(e) => setAcct(e.target.value.replace(/\D/g, "").slice(0, 17))}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
                placeholder="6–17 digits"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-start-3">
              <label className="text-xs text-white/70">Re-enter account number</label>
              <input
                inputMode="numeric"
                value={acct2}
                onChange={(e) => setAcct2(e.target.value.replace(/\D/g, "").slice(0, 17))}
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
                placeholder="Must match"
              />
              {acct2.length > 0 && acct !== acct2 && (
                <p className="text-[11px] text-red-400 mt-1">Account numbers don’t match.</p>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-start gap-2">
            <input
              id="ach-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="ach-consent" className="text-[12px] text-white/80 leading-relaxed">
              I authorize Horizon to initiate ACH credits and debits to and from this account for verification and
              transfers. I agree to the E-Sign consent, Regulation E disclosures, and ACH authorization. I may revoke at
              any time.
            </label>
          </div>

          <div className="mt-2">
            <button
              onClick={submitManual}
              disabled={!canSubmitManual}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[#0B0F14] disabled:opacity-50"
              style={{
                backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                boxShadow: "0 10px 28px rgba(0,180,216,.35)",
              }}
            >
              Link bank account
            </button>
          </div>
        </div>
      )}

      {showLoading && (
        <div className="mt-4 text-sm text-white/80">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium">We’re linking your bank…</p>
            <ul className="mt-2 space-y-1 text-white/70 text-xs list-disc pl-5">
              <li>Validating details</li>
              <li>Creating micro-deposits</li>
              <li>Securing your account for transfers</li>
            </ul>
            <div className="mt-3 h-2 w-full rounded bg-white/10 overflow-hidden">
              <div className="h-full w-1/2 animate-[pulse_1.6s_ease-in-out_infinite] bg-white/30" />
            </div>
          </div>
        </div>
      )}

      {showPending && (
        <div className="mt-4 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium">Pending verification</p>
            <p className="text-white/70 mt-1">
              We sent two small deposits to <strong>{bankName || "your bank"}</strong> {mask || ""}. They’ll post within
              1–2 business days. Enter both amounts below to finish linking.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                inputMode="decimal"
                placeholder="$0.00"
                value={dep1}
                onChange={(e) => setDep1(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
              />
              <input
                inputMode="decimal"
                placeholder="$0.00"
                value={dep2}
                onChange={(e) => setDep2(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={verifyDeposits}
                disabled={!dep1 || !dep2}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[#0B0F14] disabled:opacity-50"
                style={{
                  backgroundImage: "linear-gradient(90deg,#33D69F,#00E0FF)",
                  boxShadow: "0 10px 28px rgba(0,180,216,.35)",
                }}
              >
                Verify amounts
              </button>
              <button onClick={resendDeposits} className="text-xs text-white/70 hover:text-white underline">
                Resend deposits
              </button>
              <button onClick={unlink} className="ml-auto text-xs text-white/60 hover:text-red-300 underline">
                Remove bank
              </button>
            </div>
          </div>
        </div>
      )}

      {showVerified && (
        <div className="mt-4 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">External account linked</p>
              <p className="text-white/70 mt-0.5">
                {bankName || "Bank"} {mask || ""} — Holder: {holder || "You"}
              </p>
            </div>
            <button onClick={unlink} className="text-xs text-white/60 hover:text-red-300 underline">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- UI bits -------------------------------- */
function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle && <p className="text-white/70 mt-1 text-sm">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-white/80">
      {label}
      {children}
    </label>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5"
      />
    </div>
  );
}

function SelectableCard({ active, onToggle, icon, title, subtitle, children }: any) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left rounded-2xl border p-5 transition ${
        active ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/7"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 grid place-items-center">{icon}</div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-white/60">{subtitle}</div>}
        </div>
      </div>
      {children}
    </button>
  );
}

function ProgressRing({ value = 0 }: { value?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-10 w-10 rounded-full grid place-items-center bg-white/5 border border-white/10">
      <svg width="40" height="40" viewBox="0 0 36 36" className="-rotate-90 opacity-80">
        <circle cx="18" cy="18" r="14" stroke="white" strokeOpacity="0.15" strokeWidth="4" fill="none" />
        <circle
          cx="18"
          cy="18"
          r="14"
          stroke="#00E0FF"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${2 * Math.PI * 14}`}
          strokeDashoffset={`${(1 - clamped / 100) * (2 * Math.PI * 14)}`}
        />
      </svg>
      <span className="absolute text-[10px] text-white/70">{Math.round(clamped)}%</span>
    </div>
  );
}

/* -------------------------------- Utilities ------------------------------- */

// Basic ABA routing number checksum (3-7-1 pattern)
function validateAba(r: string) {
  if (!/^\d{9}$/.test(r)) return false;
  const d = r.split("").map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}
