"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import Logo from "@/components/logo";
import { Button, Input, Label } from "@/components/primitives";
import { PATHS } from "@/config/routes";
import API from "@/libs/api";

type Stage = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stage, setStage] = useState<Stage>("request");

  // email step
  const [email, setEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");

  // reset step (link)
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const emailValid = /.+@.+\..+/.test(email);
  const pwValid = newPassword.length >= 8; // align with backend min 8
  const pwMatch = newPassword && newPassword === confirmPassword;

  /* ---------------------- If opened via email link ------------------------ */
  useEffect(() => {
    const token = searchParams.get("token") || "";
    const emailFromLink = searchParams.get("email") || "";

    if (token && emailFromLink) {
      setResetToken(token);
      setEmail(emailFromLink);
      setStage("reset");
    }
  }, [searchParams]);

  /* ---------------------------- Step 1: Request ---------------------------- */
  async function handleRequestLink() {
    setRequestError("");
    setRequestSuccess("");

    if (!emailValid) {
      setRequestError("Enter a valid email.");
      return;
    }

    setRequestLoading(true);
    try {
      // Backend: POST /api/auth/password/reset/request { email }
      await API.requestPasswordReset(email);

      setRequestSuccess(
        "If an account exists for this email, we’ve sent a secure reset link."
      );
    } catch (e: any) {
      setRequestError(e?.message || "Failed to start reset. Try again.");
    } finally {
      setRequestLoading(false);
    }
  }

  /* ------------------------- Step 2: Set new password --------------------- */
  async function handleResetPassword() {
    setVerifyError("");

    if (!resetToken) {
      setVerifyError("This reset link is invalid or has expired.");
      return;
    }
    if (!pwValid) {
      setVerifyError("Password should be at least 8 characters.");
      return;
    }
    if (!pwMatch) {
      setVerifyError("Passwords do not match.");
      return;
    }

    setVerifyLoading(true);
    try {
      // Backend: POST /api/auth/password/reset/confirm { email, token, password }
      await API.confirmPasswordReset({
        email,
        token: resetToken,
        password: newPassword,
      });

      setStage("done");
    } catch (e: any) {
      setVerifyError(e?.message || "Failed to reset password. Try again.");
    } finally {
      setVerifyLoading(false);
    }
  }

  /* --------------------------------- UI ----------------------------------- */

  return (
    <div className="min-h-svh bg-[#0E131B] text-[#E6EEF7] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0E131B]/70 border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(PATHS.DASHBOARD_LOGIN)}
              className="mr-1 rounded-full p-1.5 hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4 text-[#9BB0C6]" />
            </button>
            <Logo />
            <span className="hidden sm:inline text-sm text-[#9BB0C6]">
              Reset password
            </span>
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
          {/* STEP 1: REQUEST LINK */}
          {stage === "request" && (
            <>
              <h1 className="text-2xl font-semibold mb-1">
                Forgot your password?
              </h1>
              <p className="text-sm text-[#9BB0C6] mb-6">
                Enter the email linked to your Horizon account and we’ll email
                you a secure link to reset it.
              </p>

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

                {requestError && (
                  <div className="text-rose-400 text-xs mt-1">
                    {requestError}
                  </div>
                )}
                {requestSuccess && (
                  <div className="text-emerald-400 text-xs mt-1">
                    {requestSuccess}
                  </div>
                )}

                <Button
                  disabled={requestLoading || !emailValid}
                  onClick={handleRequestLink}
                  className="mt-2 gap-2 w-full justify-center text-[#0E131B]"
                  style={{
                    backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                    boxShadow: "0 8px 24px rgba(0,180,216,.35)",
                  }}
                >
                  {requestLoading ? "Sending link..." : "Send reset link"}
                </Button>

                <p className="text-xs text-center text-[#9BB0C6] mt-4">
                  Remember it now?{" "}
                  <button
                    className="text-[#00E0FF] hover:underline"
                    onClick={() => router.push(PATHS.DASHBOARD_LOGIN)}
                  >
                    Back to login
                  </button>
                </p>
              </div>
            </>
          )}

          {/* STEP 2: SET NEW PASSWORD (FROM LINK) */}
          {stage === "reset" && (
            <>
              <h1 className="text-2xl font-semibold mb-1">
                Set a new password
              </h1>
              <p className="text-sm text-[#9BB0C6]">
                You’re resetting the password for <b>{email}</b>. Choose a new
                password you haven’t used here before.
              </p>

              {verifyError && (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs p-2">
                  {verifyError}
                </div>
              )}

              <div className="mt-6 grid gap-4">
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <div className="mt-1 relative flex items-center">
                    <Input
                      id="new-password"
                      type={showPw ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10 bg-white/5 border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-2 text-[#9BB0C6] hover:text-[#E6EEF7]"
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-[#9BB0C6]">
                    Minimum 8 characters for security.
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <div className="mt-1 relative flex items-center">
                    <Input
                      id="confirm-password"
                      type={showPw2 ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      className="pr-10 bg-white/5 border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw2((s) => !s)}
                      className="absolute right-2 text-[#9BB0C6] hover:text-[#E6EEF7]"
                    >
                      {showPw2 ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {pwMatch && newPassword && (
                    <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Passwords match
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleResetPassword}
                  disabled={verifyLoading}
                  className="mt-1 gap-2 w-full justify-center text-[#0E131B]"
                  style={{
                    backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                    boxShadow: "0 8px 24px rgba(0,180,216,.35)",
                  }}
                >
                  {verifyLoading ? "Updating…" : "Reset password"}
                  <Lock className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 3: DONE */}
          {stage === "done" && (
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-semibold mb-1">
                  Password updated
                </h1>
                <p className="text-sm text-[#9BB0C6]">
                  Your Horizon password has been reset. You can now sign in with
                  your new details.
                </p>
              </div>
              <Button
                onClick={() => router.replace(PATHS.DASHBOARD_LOGIN)}
                className="mt-2 gap-2 w-full justify-center text-[#0E131B]"
                style={{
                  backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                  boxShadow: "0 8px 24px rgba(0,180,216,.35)",
                }}
              >
                Go to login
              </Button>
            </div>
          )}
        </motion.div>
      </main>

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
