"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  Fingerprint,
  KeyRound,
  Timer,
  CheckCircle2,
} from "lucide-react";
import Logo from "@/components/logo";
import { Button, Input, Label } from "@/components/primitives";
import { PATHS } from "@/config/routes";
import API from "@/libs/api";
import { registerThisDevice } from "@/libs/fp";

/* -------------------------------------------------------------------------- */
/*                         Horizon • Unified Login (BE-first)                 */
/*  - Email+Password -> /auth/login (sets cookies)                            */
/*  - OTP gate -> /auth/otp/send + /auth/otp/verify                           */
/*  - After OTP:                                                              */
/*      -> if no PIN/passkey, go to onboarding to set with /users/me/security */
/*      -> else proceed (and Quick Login available next time)                 */
/*  - Quick Login:                                                            */
/*      • PIN  -> /auth/pin/login                                             */
/*      • Passkey (WebAuthn) -> /webauthn/assertion/options + /result         */
/* -------------------------------------------------------------------------- */

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function LoginPage() {
  const router = useRouter();

  // Email/password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Quick login (PIN / Fingerprint)
  const [usePin, setUsePin] = useState(false);
  const [pinEmail, setPinEmail] = useState("");
  const [pin, setPin] = useState("");
  const [quickError, setQuickError] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // OTP modal (post-password step)
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  // Seed passkey flag from local cache (not auth-critical; server is source of truth)
  useEffect(() => {
    try {
      const passkey = localStorage.getItem("hb_passkey") === "1";
      if (passkey) setBiometricEnabled(true);
    } catch {}
  }, []);

  // OTP resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const emailValid = /.+@.+\..+/.test(email);
  const pwValid = password.length >= 6;
  const canLogin = emailValid && pwValid && !loading;

  const canPinLogin = useMemo(
    () => /.+@.+\..+/.test(pinEmail) && /^\d{4,6}$/.test(pin),
    [pinEmail, pin]
  );

  /* ---------------------------- Email + Password --------------------------- */
  const handleEmailLogin = async () => {
    setErr("");
    setLoading(true);
    try {
      // 1) Login (sets httpOnly cookies)
      const res = await API.login(email, password);

      // cache optional flags for UX
      try {
        if (res?.flags?.hb_passkey) localStorage.setItem("hb_passkey", res.flags.hb_passkey);
        if (typeof res?.onboarding?.setupPercent === "number") {
          localStorage.setItem("hb_setup_percent", String(res.onboarding.setupPercent));
        }
        if (res?.onboarding?.status)
          localStorage.setItem("hb_onboarding_status", res.onboarding.status);
        localStorage.setItem("hb_logged_in", "1");
      } catch {}

      // 2) Force OTP to harden login flow
      setOtpOpen(true);
      await sendOtpNow(email);
    } catch (e: any) {
      setErr(e?.message || "Login failed.");
      setLoading(false);
    }
  };

  async function sendOtpNow(addr: string) {
    setOtpError("");
    setOtp(["", "", "", "", "", ""]);
    setOtpSending(true);
    try {
      await API.sendOtp(addr);
      setResendIn(60);
    } catch (e: any) {
      setOtpError(e?.message || "Failed to send code.");
      setOtpOpen(false);
      setLoading(false);
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtpNow() {
    setOtpError("");
    const code = otp.join("");
    if (code.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpVerifying(true);
    try {
      // 3) Verify OTP
      await API.verifyOtp(email, code);
      setOtpOpen(false);

      // 4) Ask backend for current security state
      const me = await API.me().catch(() => null);
      const hasPin = !!me?.user?.hasPin;
      const passkeyEnabled = !!me?.user?.passkeyEnabled;

      // 4.5) Register/update this device fingerprint on the backend
  try {
     await registerThisDevice(passkeyEnabled ? { type: "passkey" } : undefined);
   } catch { /* non-blocking */ }

      // 5) If neither PIN nor passkey saved yet, send to onboarding to collect & save to backend
      if (!hasPin && !passkeyEnabled) {
        localStorage.setItem("hb_onboarding_status", "IN_PROGRESS");
        router.replace(PATHS.DASHBOARD_ONBOARDING); // Your onboarding should POST /users/me/security
        return;
      }

      // Otherwise continue to app
      const status = localStorage.getItem("hb_onboarding_status");
      const setup = Number(localStorage.getItem("hb_setup_percent") || 0);
      if (status === "COMPLETE" || setup >= 95) router.replace(PATHS.DASHBOARD_HOME);
      else router.replace(PATHS.DASHBOARD_ONBOARDING);
    } catch (e: any) {
      setOtpError(e?.message || "Verification failed.");
    } finally {
      setOtpVerifying(false);
      setLoading(false);
    }
  }

  /* ------------------------------- Quick Login ----------------------------- */
  async function handlePinLogin() {
    setQuickError("");
    try {
      const res = await fetch(`${BASE}/auth/pin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pinEmail, pin }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "PIN login failed");

      // success: backend sets cookies; optional FE flags
      try {
        if (data?.flags?.hb_passkey) localStorage.setItem("hb_passkey", data.flags.hb_passkey);
        localStorage.setItem("hb_logged_in", "1");
      } catch {}
      router.replace(PATHS.DASHBOARD_HOME);
    } catch (e: any) {
      setQuickError(e?.message || "Incorrect PIN or email.");
    }
  }

  async function handleFingerprintLogin() {
    setQuickError("");
    try {
      // Ask server for WebAuthn assertion options
      const optRes = await fetch(`${BASE}/webauthn/assertion/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pinEmail }),
        cache: "no-store",
      });
      const options = await optRes.json().catch(() => ({}));
      if (!optRes.ok) throw new Error(options?.error || "Unable to start fingerprint login.");

      // Convert options to proper types
      const publicKey: PublicKeyCredentialRequestOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: (options.allowCredentials || []).map((c: any) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })),
      };

      // WebAuthn get()
      const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
      if (!assertion) throw new Error("Authentication cancelled.");

      // Send result for verification; server should set cookies on success
      const resultRes = await fetch(`${BASE}/webauthn/assertion/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialToJSON(assertion, pinEmail)),
        cache: "no-store",
      });
      const result = await resultRes.json().catch(() => ({}));
      if (!resultRes.ok) throw new Error(result?.error || "Fingerprint login failed.");

      localStorage.setItem("hb_logged_in", "1");
      router.replace(PATHS.DASHBOARD_HOME);
    } catch (e: any) {
      setQuickError(
        e?.message ||
          "Fingerprint login failed. If this device isn’t enrolled yet, enable it in onboarding."
      );
    }
  }

  /* --------------------------------- UI ----------------------------------- */
  return (
    <div className="min-h-svh bg-[#0E131B] text-[#E6EEF7] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0E131B]/70 border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden sm:inline text-sm text-[#9BB0C6]">Login</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#9BB0C6]">
            <ShieldCheck className="h-4 w-4" />
            Encrypted session
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 grid place-items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101826] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
        >
          <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-[#9BB0C6] mb-6">Sign in to your Horizon account</p>

          {/* Toggle */}
          <div className="flex justify-center gap-2 mb-5">
            <button
              className={`px-3 py-1 rounded-full text-xs ${
                !usePin ? "bg-[#00B4D8]/20 text-[#00E0FF]" : "bg-white/5 text-[#9BB0C6]"
              }`}
              onClick={() => setUsePin(false)}
            >
              Email Login
            </button>
            <button
              className={`px-3 py-1 rounded-full text-xs ${
                usePin ? "bg-[#00B4D8]/20 text-[#00E0FF]" : "bg-white/5 text-[#9BB0C6]"
              }`}
              onClick={() => setUsePin(true)}
            >
              Quick Login
            </button>
          </div>

          {/* Email/Password */}
          {!usePin && (
            <div className="grid gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#9BB0C6]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="mt-1 relative flex items-center">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 bg-white/5 border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 text-[#9BB0C6] hover:text-[#E6EEF7]"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {err && <div className="text-rose-400 text-xs">{err}</div>}

              <Button
                disabled={!canLogin}
                onClick={handleEmailLogin}
                className="mt-2 gap-2 w-full justify-center text-[#0E131B]"
                style={{
                  backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                  boxShadow: "0 8px 24px rgba(0,180,216,.35)",
                }}
              >
                {loading ? "Signing in..." : "Sign in"}
                <LogIn className="h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-[#9BB0C6] mt-4">
                Don’t have an account?{" "}
                <button className="text-[#00E0FF] hover:underline" onClick={() => router.push(PATHS.CREATE_ACCOUNT)}>
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* Quick Login */}
          {usePin && (
            <div className="grid gap-4 mt-2">
              <div>
                <Label htmlFor="pin-email">Email</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#9BB0C6]" />
                  <Input
                    id="pin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={pinEmail}
                    onChange={(e) => setPinEmail(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pin">App PIN</Label>
                <div className="mt-1 relative flex items-center">
                  <KeyRound className="absolute left-3 text-[#9BB0C6]" />
                  <Input
                    id="pin"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10 text-center tracking-[.4em] bg-white/5 border-white/10"
                  />
                </div>
              </div>

              {quickError && <div className="text-rose-400 text-xs text-center">{quickError}</div>}

              <Button
                onClick={handlePinLogin}
                disabled={!canPinLogin}
                className="mt-1 w-full justify-center text-[#0E131B]"
                style={{
                  backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                  boxShadow: "0 8px 24px rgba(0,180,216,.35)",
                }}
              >
                Unlock
                <Lock className="h-4 w-4 ml-1" />
              </Button>

              <button
                onClick={handleFingerprintLogin}
                className={`mt-2 flex items-center justify-center gap-2 text-sm ${
                  biometricEnabled ? "text-[#00B4D8] hover:text-white" : "text-[#9BB0C6]"
                }`}
                disabled={!biometricEnabled || !pinEmail}
                title={
                  biometricEnabled
                    ? "Authenticate with fingerprint"
                    : "Fingerprint not set up yet — enable it during onboarding."
                }
              >
                <Fingerprint className="h-5 w-5" />
                Use Fingerprint
              </button>
            </div>
          )}
        </motion.div>
      </main>

      {/* OTP Dialog */}
      {otpOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1622] p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold">Verify your email</h2>
            </div>
            <p className="text-sm text-[#9BB0C6] mt-1">
              Enter the 6-digit code we sent to <b>{email}</b>.
            </p>

            {otpError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs p-2">
                {otpError}
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-2">
              {otp.map((v, i) => (
                <Input
                  key={i}
                  maxLength={1}
                  value={v}
                  onChange={(e) => handleOtpChange(i, e.target.value, otp, setOtp)}
                  className="w-10 h-12 text-center text-lg bg-white/5 border-white/10"
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[#9BB0C6] flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {resendIn > 0 ? `You can resend in ${resendIn}s` : "You can resend a code now."}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => sendOtpNow(email)} disabled={otpSending || resendIn > 0}>
                  {otpSending ? "Sending…" : "Resend"}
                </Button>
                <Button onClick={verifyOtpNow} disabled={otpVerifying} className="gap-2">
                  {otpVerifying ? "Verifying…" : "Verify"}
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ duration: 1 }}
          className="absolute -top-32 -left-16 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#00B4D8]/30 to-[#00E0FF]/10 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="absolute -bottom-32 -right-16 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#33D69F]/20 to-[#00B4D8]/10 blur-3xl"
        />
      </div>
    </div>
  );
}

/* ------------------------------ Utilities ------------------------------ */

function handleOtpChange(i: number, val: string, otp: string[], setOtp: (v: string[]) => void) {
  const clean = val.replace(/\D/g, "").slice(0, 1);
  const next = [...otp];
  next[i] = clean;
  setOtp(next);
}

function base64urlToBuffer(b64url: string) {
  const pad = (s: string) => s + "===".slice((s.length + 3) % 4);
  const b64 = pad(b64url.replace(/-/g, "+").replace(/_/g, "/"));
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function credentialToJSON(cred: PublicKeyCredential, email: string) {
  const clientDataJSON = bufferToBase64url(cred.response.clientDataJSON);
  const authenticatorData = bufferToBase64url(
    (cred.response as AuthenticatorAssertionResponse).authenticatorData
  );
  const signature = bufferToBase64url((cred.response as AuthenticatorAssertionResponse).signature);
  const userHandle =
    (cred.response as AuthenticatorAssertionResponse).userHandle &&
    bufferToBase64url((cred.response as AuthenticatorAssertionResponse).userHandle!);
  const rawId = bufferToBase64url(cred.rawId);
  return {
    email,
    id: cred.id,
    rawId,
    type: cred.type,
    response: {
      clientDataJSON,
      authenticatorData,
      signature,
      userHandle: userHandle || null,
    },
  };
}
