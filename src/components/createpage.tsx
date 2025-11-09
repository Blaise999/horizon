"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2, ShieldCheck, Eye, EyeOff, Lock, Phone, Mail, User, Calendar, MapPin,
  ChevronRight, ChevronLeft, Upload, IdCard, Info, CircleHelp, BadgeCheck, Timer
} from "lucide-react";
import Logo from "@/components/logo";
import { PATHS } from "@/config/routes";
import { registerThisDevice } from "@/libs/fp";

// shadcn/ui (your wrapper)
import {
  Button, Input, Label, Checkbox,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  Progress, cn
} from "@/components/primitives";

// ✅ Use your canonical API object
import API from "@/libs/api";

/**
 * Horizon Create Account Page — Email OTP
 * - Email-only OTP (send + verify via backend)
 * - No demo localStorage seeding
 * - Submit registration to backend
 */
export default function CreateAccountPage() {
  const router = useRouter();
  const LOGIN_PATH = "/dashboard/loginpage";
  const ONBOARDING_PATH = (PATHS as any)?.DASHBOARD_ONBOARDING || "/dashboard/onboarding";

  const [step, setStep] = useState(1); // 1..5
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Backend errors / notices
  const [notice, setNotice] = useState<string>("");

  // Step 1 (auth)
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phone, setPhone] = useState(""); // still collected, not OTP’d
  const [password, setPassword] = useState("");
  const [promo, setPromo] = useState("");

  // OTP modal state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0); // countdown seconds

  // Step 2 (identity)
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [citizen, setCitizen] = useState("US");
  const [ssn, setSsn] = useState("");

  // Step 3 (address)
  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [stateUS, setStateUS] = useState("");
  const [zip, setZip] = useState("");
  const [mailingDifferent, setMailingDifferent] = useState(false);

  // Step 4 (security & consents)
  const [mfa, setMfa] = useState("sms");
  const [agreeESign, setAgreeESign] = useState(false);
  const [agreeRegE, setAgreeRegE] = useState(false);
  const [agreeTIS, setAgreeTIS] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const steps = [
    { id: 1, title: "Create account", desc: "Email (verify), phone and password" },
    { id: 2, title: "Your details", desc: "Legal name, DOB, SSN/ITIN" },
    { id: 3, title: "Address", desc: "Residential address (no P.O. Box)" },
    { id: 4, title: "Security & consent", desc: "2FA and disclosures" },
    { id: 5, title: "Review", desc: "Confirm & submit" },
  ];

  const progress = useMemo(() => (step / steps.length) * 100, [step]);

  // Validators
  const emailValid = /.+@.+\..+/.test(email);
  const phoneValid = /^\+1\d{10}$/.test(phone); // E.164 US only
  const passwordScore = useMemo(() => scorePassword(password), [password]);
  const dobValid = useMemo(() => isAdult(dob, 18), [dob]);
  const ssnValid = /^(?!000|666|9\d\d)(\d{3})(?!00)(\d{2})(?!0000)(\d{4})$/.test(ssn.replace(/-/g, ""));
  const addrValid = !!(street1 && city && stateUS && /^\d{5}(-\d{4})?$/.test(zip));
  const consentsOk = agreeESign && agreeRegE && agreeTIS && agreePrivacy;

  // OTP resend timer
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  function next() { if (step < steps.length) setStep(step + 1); }
  function prev() { if (step > 1) setStep(step - 1); }

  /* --------------------------------- Actions -------------------------------- */

  async function handleSendOtp() {
    setOtpError("");
    setNotice("");
    if (!emailValid) return setOtpError("Enter a valid email first.");
    if (resendIn > 0) return; // throttle

    setOtp(["", "", "", "", "", ""]);
    setOtpOpen(true);
    setOtpSending(true);
    try {
      await API.sendOtp(email); // ✅ /auth/otp/send
      setResendIn(60);
    } catch (e: any) {
      setOtpError(e?.message || "Failed to send code.");
      setOtpOpen(false);
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    setOtpError("");
    setNotice("");
    const code = otp.join("");
    if (code.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpVerifying(true);
    try {
      await API.verifyOtp(email, code); // ✅ /auth/otp/verify
      setEmailVerified(true);
      setOtpOpen(false);
      setNotice("Email verified.");
    } catch (e: any) {
      setOtpError(e?.message || "Verification failed.");
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setNotice("");
    try {
      // ✅ /auth/signup
      await API.signup({
        email,
        phone,
        password,
        promo: promo || undefined,
        identity: {
          firstName,
          middleName: middleName || undefined,
          lastName,
          dob,
          citizen,
          ssn,
        },
        address: {
          street1,
          street2: street2 || undefined,
          city,
          state: stateUS,
          zip,
          mailingDifferent,
        },
        security: {
          mfa,
          consents: {
            eSign: agreeESign,
            regE: agreeRegE,
            tis: agreeTIS,
            privacy: agreePrivacy,
          },
          marketing,
        },
      });
        // ➜ Immediately register this device (cookies already set by signup)
 try {
     await registerThisDevice();
   } catch { /* non-blocking */ }

      // ➜ Finish onboarding after signup
      router.replace(ONBOARDING_PATH);
    } catch (e: any) {
      setNotice(e?.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-svh bg-[#0E131B] text-[#E6EEF7]">
        {/* Top app bar */}
        <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-[#0E131B]/70 border-b border-white/5">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="hidden sm:inline text-sm text-[#9BB0C6]">Create Account</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[#9BB0C6]">
                <ShieldCheck className="h-4 w-4" />
                Bank-grade encryption
              </div>
              <Button
                variant="secondary"
                onClick={() => router.push(LOGIN_PATH)}
                className="h-8 px-3 text-xs"
              >
                Already have an account? Sign in
              </Button>
            </div>
          </div>
          <div className="w-full">
            <Progress value={progress} className="h-1 rounded-none bg-white/5" />
          </div>
        </header>

        {/* Page body */}
        <main className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
          {/* Left rail: Steps */}
          <aside className="hidden lg:block">
            <div className="sticky top-16 space-y-4">
              {steps.map((s, i) => (
                <StepItem key={s.id} index={i} active={step === s.id} done={step > s.id} title={s.title} desc={s.desc} />
              ))}

              {notice && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                  {notice}
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <IdCard className="h-5 w-5" />
                  <p className="text-sm font-medium">Why we ask for SSN</p>
                </div>
                <p className="mt-2 text-xs text-[#9BB0C6] leading-relaxed">
                  U.S. law requires banks to verify identity. Your SSN helps us prevent fraud and protect your account. It’s encrypted and never sold.
                </p>
              </div>
            </div>
          </aside>

          {/* Right: Form card */}
          <section className="relative">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-white/10 bg-[#101826] p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
            >
              {step === 1 && (
                <StepOneAuth
                  email={email}
                  setEmail={(v: string) => { setEmail(v); setEmailVerified(false); }}
                  phone={phone}
                  setPhone={setPhone}
                  password={password}
                  setPassword={setPassword}
                  promo={promo}
                  setPromo={setPromo}
                  showPw={showPw}
                  setShowPw={setShowPw}
                  passwordScore={passwordScore}
                  emailValid={emailValid}
                  phoneValid={phoneValid}
                  onSendOtp={handleSendOtp}
                  emailVerified={emailVerified}
                  resendIn={resendIn}
                />
              )}

              {step === 2 && (
                <StepTwoIdentity
                  firstName={firstName}
                  setFirstName={setFirstName}
                  middleName={middleName}
                  setMiddleName={setMiddleName}
                  lastName={lastName}
                  setLastName={setLastName}
                  dob={dob}
                  setDob={setDob}
                  citizen={citizen}
                  setCitizen={setCitizen}
                  ssn={ssn}
                  setSsn={setSsn}
                  dobValid={dobValid}
                  ssnValid={ssnValid}
                />
              )}

              {step === 3 && (
                <StepThreeAddress
                  street1={street1}
                  setStreet1={setStreet1}
                  street2={street2}
                  setStreet2={setStreet2}
                  city={city}
                  setCity={setCity}
                  stateUS={stateUS}
                  setStateUS={setStateUS}
                  zip={zip}
                  setZip={setZip}
                  mailingDifferent={mailingDifferent}
                  setMailingDifferent={setMailingDifferent}
                  addrValid={!!addrValid}
                />
              )}

              {step === 4 && (
                <StepFourSecurity
                  mfa={mfa}
                  setMfa={setMfa}
                  agreeESign={agreeESign}
                  setAgreeESign={setAgreeESign}
                  agreeRegE={agreeRegE}
                  setAgreeRegE={setAgreeRegE}
                  agreeTIS={agreeTIS}
                  setAgreeTIS={setAgreeTIS}
                  agreePrivacy={agreePrivacy}
                  setAgreePrivacy={setAgreePrivacy}
                  marketing={marketing}
                  setMarketing={setMarketing}
                />
              )}

              {step === 5 && (
                <StepFiveReview
                  data={{
                    email,
                    phone,
                    firstName,
                    middleName,
                    lastName,
                    dob,
                    citizen,
                    ssn,
                    street1,
                    street2,
                    city,
                    stateUS,
                    zip,
                    mfa,
                    agreeESign,
                    agreeRegE,
                    agreeTIS,
                    agreePrivacy,
                    marketing,
                  }}
                />
              )}

              {/* Footer controls */}
              <div className="mt-8 flex items-center justify-between">
                <Button variant="ghost" onClick={prev} disabled={step === 1} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>

                {step < 5 ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(LOGIN_PATH)}
                      className="text-xs text-[#00E0FF] hover:underline"
                    >
                      Already have an account? Sign in
                    </button>

                    <Button
                      onClick={next}
                      disabled={!canProceed(step, { emailValid, phoneValid, passwordScore, dobValid, ssnValid, addrValid, consentsOk, emailVerified })}
                      className="gap-2"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? "Creating..." : "Create account"}
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          </section>
        </main>

        {/* OTP Dialog */}
        <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
          <DialogContent className="bg-[#0F1622] text-[#E6EEF7] border-white/10">
            <DialogHeader>
              <DialogTitle>Verify your email</DialogTitle>
              <DialogDescription className="text-[#9BB0C6]">
                Enter the 6-digit code we sent to <b>{email}</b>.
              </DialogDescription>
            </DialogHeader>

            {otpError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs p-2">
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
                <Button variant="ghost" onClick={handleSendOtp} disabled={otpSending || resendIn > 0}>
                  {otpSending ? "Sending…" : "Resend"}
                </Button>
                <Button onClick={handleVerifyOtp} disabled={otpVerifying} className="gap-2">
                  {otpVerifying ? "Verifying…" : "Verify"} <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Background accents */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1.2 }}
            className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[#00B4D8]/30 to-[#00E0FF]/10 blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-[#33D69F]/20 to-[#00B4D8]/10 blur-3xl"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

/* --------------------------- Step Components --------------------------- */

function SectionTitle({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/5 p-2 border border-white/10">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-[#9BB0C6]">{desc}</p>
    </div>
  );
}

function StepItem({ index, active, done, title, desc }: { index: number; active: boolean; done: boolean; title: string; desc: string }) {
  return (
    <div className={cn("rounded-2xl border p-4", active ? "border-[#00E0FF]/40 bg-white/5" : "border-white/10 bg-white/[0.02]")}>
      <div className="flex items-center gap-3">
        <div className={cn("h-8 w-8 shrink-0 grid place-items-center rounded-full border text-xs",
          done ? "border-emerald-400/60 text-emerald-300"
               : active ? "border-[#00E0FF]/60 text-[#00E0FF]"
               : "border-white/20 text-[#9BB0C6]")}>{index + 1}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-[#9BB0C6]">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function StepOneAuth({
  email, setEmail,
  phone, setPhone,
  password, setPassword,
  promo, setPromo,
  showPw, setShowPw,
  passwordScore,
  emailValid,
  phoneValid,
  onSendOtp,
  emailVerified,
  resendIn,
}: any) {
  return (
    <div>
      <SectionTitle icon={User} title="Create your Horizon account" desc="Verify your email with a one-time code to continue." />

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="email">Email</Label>
            {emailVerified && (
              <span className="inline-flex items-center gap-1 text-emerald-300 text-xs">
                <BadgeCheck className="h-4 w-4" /> Verified
              </span>
            )}
          </div>
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
          {!emailValid && email.length > 2 && <p className="mt-1 text-xs text-red-400">Enter a valid email address.</p>}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="phone">Mobile (U.S.)</Label>
            <HelpTip text="E.164 format, e.g. +14155550123 (no OTP sent to phone right now)." />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#9BB0C6]" />
            <Input
              id="phone"
              placeholder="+1xxxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          {!phoneValid && phone.length > 4 && <p className="mt-1 text-xs text-red-400">Enter a valid U.S. number in +1 format.</p>}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="password">Password</Label>
          <div className="mt-1 relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="At least 10 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 bg-white/5 border-white/10"
            />
            <button type="button" onClick={() => setShowPw((s: boolean) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9BB0C6] hover:text-[#E6EEF7]">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordMeter score={passwordScore} />
        </div>

        <div>
          <Label htmlFor="promo">Referral / promo (optional)</Label>
          <Input id="promo" placeholder="PROMO2025" value={promo} onChange={(e) => setPromo(e.target.value)} className="bg-white/5 border-white/10" />
        </div>

        <div className="md:col-span-2 flex items-center justify-between gap-3">
          <div className="text-xs text-[#9BB0C6] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            We’ll email a six-digit code to verify your address.
          </div>
          <Button
            variant="secondary"
            onClick={onSendOtp}
            disabled={!emailValid || emailVerified || resendIn > 0}
          >
            {emailVerified ? "Verified" : resendIn > 0 ? `Resend in ${resendIn}s` : "Send code"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepTwoIdentity({
  firstName, setFirstName,
  middleName, setMiddleName,
  lastName, setLastName,
  dob, setDob,
  citizen, setCitizen,
  ssn, setSsn,
  dobValid,
  ssnValid,
}: any) {
  return (
    <div>
      <SectionTitle icon={IdCard} title="Your legal details" desc="Use your legal name as it appears on your government ID." />

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-white/5 border-white/10" />
        </div>
        <div>
          <Label htmlFor="middleName">Middle (optional)</Label>
          <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="bg-white/5 border-white/10" />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-white/5 border-white/10" />
        </div>

        <div>
          <Label htmlFor="dob">Date of birth</Label>
          <div className="mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#9BB0C6]" />
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          {dob && !dobValid && <p className="mt-1 text-xs text-red-400">Must be 18 or older.</p>}
        </div>

        <div>
          <Label htmlFor="citizen">Citizenship</Label>
          <Select value={citizen} onValueChange={setCitizen}>
            <SelectTrigger id="citizen" className="bg-white/5 border-white/10">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F1622] border-white/10">
              <SelectItem value="US">U.S. citizen</SelectItem>
              <SelectItem value="US_resident">U.S. resident (alien)</SelectItem>
              <SelectItem value="non_us">Non-resident alien</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ssn">SSN / ITIN</Label>
            <HelpTip text="Used for identity verification. Stored encrypted." />
          </div>
          <Input id="ssn" inputMode="numeric" placeholder="123-45-6789" value={formatSSN(ssn)} onChange={(e) => setSsn(e.target.value)} className="bg-white/5 border-white/10" />
          {ssn && !ssnValid && <p className="mt-1 text-xs text-red-400">Enter a valid SSN/ITIN.</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <Label>Upload your ID (front & back or passport)</Label>
        <div className="grid md:grid-cols-2 gap-3">
          <GhostUpload label="Front" />
          <GhostUpload label="Back / Passport" />
        </div>
        <p className="text-xs text-[#9BB0C6]">HEIC/JPG/PNG/PDF up to 10MB. Good lighting helps.</p>
      </div>
    </div>
  );
}

function StepThreeAddress({
  street1, setStreet1,
  street2, setStreet2,
  city, setCity,
  stateUS, setStateUS,
  zip, setZip,
  mailingDifferent, setMailingDifferent,
  addrValid,
}: any) {
  return (
    <div>
      <SectionTitle icon={MapPin} title="Your address" desc="We’ll standardize with USPS to ensure accurate delivery and compliance." />

      <div className="grid gap-4">
        <div>
          <Label htmlFor="street1">Street address</Label>
          <Input id="street1" value={street1} onChange={(e) => setStreet1(e.target.value)} placeholder="123 Market St" className="bg-white/5 border-white/10" />
          <p className="mt-1 text-xs text-[#9BB0C6]">No P.O. Boxes for residential address.</p>
        </div>
        <div>
          <Label htmlFor="street2">Apt / Suite (optional)</Label>
          <Input id="street2" value={street2} onChange={(e) => setStreet2(e.target.value)} placeholder="Apt 5B" className="bg-white/5 border-white/10" />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Select value={stateUS} onValueChange={setStateUS}>
              <SelectTrigger id="state" className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-[#0F1622] border-white/10 max-h-64 overflow-auto">
                {US_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="zip">ZIP code</Label>
            <Input id="zip" inputMode="numeric" placeholder="94105 or 94105-1234" value={zip} onChange={(e) => setZip(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="mailing"
            checked={mailingDifferent}
            onChange={(e) => setMailingDifferent(e.target.checked)}
          />
          <Label htmlFor="mailing" className="text-sm">
            My mailing address is different
          </Label>
        </div>

        {!addrValid && (street1 || city || stateUS || zip) && (
          <p className="text-xs text-red-400">Please complete all required address fields with a valid ZIP.</p>
        )}

        <div className="rounded-xl border border-white/10 p-3 bg-white/5 text-xs text-[#9BB0C6]">
          <p>We may standardize your address (e.g., add ZIP+4). You can confirm any changes before submission.</p>
        </div>
      </div>
    </div>
  );
}

function StepFourSecurity({
  mfa, setMfa,
  agreeESign, setAgreeESign,
  agreeRegE, setAgreeRegE,
  agreeTIS, setAgreeTIS,
  agreePrivacy, setAgreePrivacy,
  marketing, setMarketing,
}: any) {
  return (
    <div>
      <SectionTitle icon={Lock} title="Security & consent" desc="Choose your 2-factor method and agree to required disclosures." />

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label>Two-factor authentication</Label>
          <div className="mt-2 grid gap-2">
            <MfaOption value="sms" current={mfa} setCurrent={setMfa} title="SMS codes" desc="Receive codes via text" />
            <MfaOption value="totp" current={mfa} setCurrent={setMfa} title="Authenticator app" desc="Use Google Authenticator, 1Password, etc." />
            <MfaOption value="passkey" current={mfa} setCurrent={setMfa} title="Passkeys" desc="Use device biometrics (WebAuthn)" />
          </div>
        </div>

        <div className="space-y-3">
          <ConsentItem label="E-Sign consent" checked={agreeESign} onChange={setAgreeESign} linkText="Read E-Sign disclosure" />
          <ConsentItem label="Electronic Funds Transfer (Reg E)" checked={agreeRegE} onChange={setAgreeRegE} linkText="Read Reg E disclosure" />
          <ConsentItem label="Truth in Savings" checked={agreeTIS} onChange={setAgreeTIS} linkText="Read account terms" />
          <ConsentItem label="Privacy notice" checked={agreePrivacy} onChange={setAgreePrivacy} linkText="Read privacy policy" />
          <ConsentItem label="Marketing emails (optional)" checked={marketing} onChange={setMarketing} optional />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 p-3 bg-white/5 text-xs text-[#9BB0C6] flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5" />
        <p>By creating an account, you certify that the information provided is accurate and you consent to identity verification and credit checks as needed. This won’t affect your score unless stated otherwise.</p>
      </div>
    </div>
  );
}

function StepFiveReview({ data }: any) {
  return (
    <div>
      <SectionTitle icon={CheckCircle2} title="Review & submit" desc="Check your details before we run verification." />

      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <ReviewCard title="Contact">
          <Row label="Email" value={data.email} />
          <Row label="Phone" value={data.phone} />
        </ReviewCard>

        <ReviewCard title="Identity">
          <Row label="Name" value={[data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ")} />
          <Row label="DOB" value={data.dob} />
          <Row label="Citizenship" value={fmtCitizen(data.citizen)} />
          <Row label="SSN/ITIN" value={maskSSN(data.ssn)} />
        </ReviewCard>

        <ReviewCard title="Address">
          <Row label="Street" value={[data.street1, data.street2].filter(Boolean).join(", ")} />
          <Row label="City/State" value={`${data.city}, ${data.stateUS}`} />
          <Row label="ZIP" value={data.zip} />
        </ReviewCard>

        <ReviewCard title="Security & consent">
          <Row label="2FA" value={data.mfa.toUpperCase()} />
          <Row label="E-Sign" value={data.agreeESign ? "Agreed" : "Not agreed"} />
          <Row label="Reg E" value={data.agreeRegE ? "Agreed" : "Not agreed"} />
          <Row label="TIS" value={data.agreeTIS ? "Agreed" : "Not agreed"} />
          <Row label="Privacy" value={data.agreePrivacy ? "Agreed" : "Not agreed"} />
          <Row label="Marketing" value={data.marketing ? "Opt-in" : "Opt-out"} />
        </ReviewCard>
      </div>

      <p className="mt-6 text-xs text-[#9BB0C6]">Submitting will run identity verification (IDV), sanctions screening, and fraud checks. If anything needs clarification, we’ll reach out securely.</p>
    </div>
  );
}

/* ------------------------------ Tiny UI bits ------------------------------ */

function PasswordMeter({ score }: { score: number }) {
  const labels = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
  const pct = Math.min(100, Math.max(0, (score / 4) * 100));
  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded bg-white/10 overflow-hidden">
        <div className="h-full rounded bg-gradient-to-r from-[#FF6B6B] via-[#F5B44B] to-[#33D69F]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-[#9BB0C6]">{labels[Math.round(score)]}</p>
    </div>
  );
}

function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <button type="button" className="text-[#9BB0C6] hover:text-[#E6EEF7]">
          <CircleHelp className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="bg-[#0F1622] border-white/10 text-xs max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function GhostUpload({ label }: { label: string }) {
  return (
    <button type="button" className="group aspect-[16/10] grid place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition">
      <div className="flex flex-col items-center gap-2 text-[#9BB0C6]">
        <Upload className="h-5 w-5" />
        <span className="text-xs">{label}</span>
      </div>
    </button>
  );
}

function MfaOption({ value, current, setCurrent, title, desc }: any) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => setCurrent(value)}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition",
        active ? "border-[#00E0FF]/40 bg-white/5" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-[#9BB0C6]">{desc}</p>
    </button>
  );
}

function ConsentItem({ label, checked, onChange, linkText, optional = false }: any) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="grid">
        <Label htmlFor={label} className="text-sm">
          {label} {!optional && <span className="text-[#9BB0C6]">(required)</span>}
        </Label>

        {linkText && (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-xs text-[#00E0FF] hover:underline text-left mt-1">{linkText}</button>
            </DialogTrigger>
            <DialogContent className="bg-[#0F1622] text-[#E6EEF7] border-white/10">
              <DialogHeader>
                <DialogTitle>{label}</DialogTitle>
                <DialogDescription className="text-[#9BB0C6]">
                  Placeholder for your full disclosure text.
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm text-[#9BB0C6] space-y-3">
                <p>Insert your policy or disclosure content here or load it dynamically.</p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ title, children }: any) {
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/[0.03]">
      <p className="text-sm font-medium mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: any) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#9BB0C6]">{label}</span>
      <span className="font-medium truncate max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

/* -------------------------------- Utilities -------------------------------- */

function canProceed(step: number, ctx: any) {
  switch (step) {
    case 1:
      return ctx.emailValid && ctx.passwordScore >= 2 && ctx.phoneValid && ctx.emailVerified;
    case 2:
      return ctx.dobValid && ctx.ssnValid;
    case 3:
      return ctx.addrValid;
    case 4:
      return ctx.consentsOk;
    default:
      return true;
  }
}

function scorePassword(pw: string) {
  let score = 0;
  if (!pw) return score;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..4
}

function isAdult(dateStr: string, minYears = 18) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const age = now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age >= minYears;
}

function fmtCitizen(val: string) {
  switch (val) {
    case "US": return "U.S. citizen";
    case "US_resident": return "U.S. resident";
    case "non_us": return "Non-resident";
    default: return val;
  }
}

function maskSSN(v: string) {
  const digits = v.replace(/\D/g, "");
  if (digits.length < 4) return "***-**-****";
  return `***-**-${digits.slice(-4)}`;
}

function formatSSN(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 9);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 3));
  if (d.length >= 4) parts.push(d.slice(3, 5));
  if (d.length >= 6) parts.push(d.slice(5, 9));
  return parts.join("-");
}

function handleOtpChange(i: number, val: string, otp: string[], setOtp: (v: string[]) => void) {
  const clean = val.replace(/\D/g, "").slice(0, 1);
  const next = [...otp];
  next[i] = clean;
  setOtp(next);
}

const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" }, { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" }, { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" }, { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" }, { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" }, { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" }, { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" }, { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" }, { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" }, { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" }, { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" }, { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" }, { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" }, { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" }, { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" }, { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" }, { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" }, { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
];
