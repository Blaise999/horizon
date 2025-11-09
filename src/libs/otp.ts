// libs/otp.ts
export type OtpBundle = {
  ref: string;                // transfer reference id
  code: string;               // plaintext (demo) 6-digit
  expiresAt: number;          // epoch ms
  attemptsLeft: number;       // throttle
  meta?: Record<string, any>; // optional
};

const KEY = "hb_otp_bundle";

export function issueOtp(ref: string, meta?: Record<string, any>): { last4: string; expiresAt: number } {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  const bundle: OtpBundle = { ref, code, expiresAt, attemptsLeft: 5, meta };
  sessionStorage.setItem(KEY, JSON.stringify(bundle));
  return { last4: code.slice(2), expiresAt };
}

export function peekOtp(): OtpBundle | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function verifyOtp(input: string): { ok: boolean; reason?: string } {
  const bundle = peekOtp();
  if (!bundle) return { ok: false, reason: "NO_BUNDLE" };
  if (Date.now() > bundle.expiresAt) return { ok: false, reason: "EXPIRED" };
  if (bundle.attemptsLeft <= 0) return { ok: false, reason: "LOCKED" };

  const ok = input.replace(/\s/g, "") === bundle.code;
  const next: OtpBundle = { ...bundle, attemptsLeft: ok ? bundle.attemptsLeft : bundle.attemptsLeft - 1 };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return ok ? { ok: true } : { ok: false, reason: "MISMATCH" };
}

export function clearOtp() {
  sessionStorage.removeItem(KEY);
}
