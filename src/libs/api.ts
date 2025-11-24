// src/libs/api.ts
// Horizon — Frontend API client (Next.js, fetch)
// - Default BASE = "/api" (first-party cookies in prod w/ Next rewrites)
// - Smart joiner avoids /api//api duplication
// - Robust request()/requestSafe() with timeout + single retry on transient errors
// - Never synthesizes recipient:{} in string mode (prevents backend trim() crashes)
// - Adds Idempotency-Key automatically for mutating requests (override/disable via opts)
// - ✅ Session-only auth token helpers (sessionStorage) + optional auto-clear on tab close/back

/* ───────────────────────── Base/Joiner ───────────────────────── */
function sanitizeBase(raw?: string) {
  let b = (raw ?? "").trim();
  if (!b) b = "/api";
  b = b.replace(/\/+$/, ""); // strip trailing slashes

  // Detect unresolved placeholders or obviously invalid values
  const looksPlaceholder =
    /<|>|your[-_ ]?render[-_ ]?backend|YOUR-RENDER|example\.com/i.test(b);
  if (looksPlaceholder) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error(
        "[API] Invalid NEXT_PUBLIC_API_URL:",
        b,
        "→ falling back to relative '/api'. Set a real absolute URL, e.g. https://your-render-service.onrender.com/api"
      );
    }
    return "/api";
  }
  return b;
}

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
export const API_BASE = sanitizeBase(RAW_BASE);
const BASE = API_BASE;

function joinApi(path: string) {
  if (!path) return BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  // If BASE already ends with /api and caller passes /api/..., avoid double /api
  if (BASE.endsWith("/api") && p.startsWith("/api/")) {
    return `${BASE}${p.replace(/^\/api/, "")}`;
  }
  return `${BASE}${p}`;
}

// Ensure a URL is parseable by the browser; throw a friendly error otherwise.
class ApiError extends Error {
  status: number;
  body: any;
  url: string;
  constructor(message: string, status: number, url: string, body?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.url = url;
  }
}
export { ApiError };

function ensureParsable(url: string) {
  try {
    if (/^https?:\/\//i.test(url)) {
      new URL(url); // absolute
    } else if (typeof window !== "undefined") {
      new URL(url, window.location.origin); // relative in browser
    } else {
      new URL(url, "http://localhost"); // relative in SSR
    }
  } catch {
    throw new ApiError(
      `Invalid request URL (${url}). Check NEXT_PUBLIC_API_URL (currently: "${RAW_BASE}")`,
      0,
      url
    );
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Json = Record<string, any>;

type ReqOpts = {
  method?: Method;
  body?: Json;
  json?: Json;
  headers?: HeadersInit;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Provide a custom Idempotency-Key string, or false to disable auto-key for mutating requests */
  idempotency?: string | false;
};

/* ───────────────────────── Auth token (session-only) ─────────────────────────
   ✅ Token dies when tab/window dies.
   ✅ Also clears any legacy localStorage token.
   Call setToken(...) after login if your backend returns a bearer.
   If cookie-based auth only, these are harmless no-ops.
---------------------------------------------------------------------------- */
export const TOKEN_KEY = "horizon_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    // kill any old persisted token
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/**
 * Optional helper: clears token on tab close / BFCache restore.
 * Use once (e.g. in root layout client guard).
 */
// ───────────────── Session token auto-clear (max coverage) ─────────────────
//
// Clears horizon_token when:
// - tab/window closes or reloads
// - page goes into BFCache / user navigates away (pagehide)
// - app/tab backgrounds (visibilitychange -> hidden)
// - browser freezes/discards tab (freeze)
// Idempotent install so multiple guards won't double-listen.
//
let __autoClearInstalled = false;

export function installSessionTokenAutoClear() {
  if (typeof window === "undefined") return () => {};

  if (__autoClearInstalled) {
    return () => {}; // already installed
  }
  __autoClearInstalled = true;

  const kill = () => clearToken();

  try {
    // extra safety: nuke any legacy persisted token on install
    localStorage.removeItem(TOKEN_KEY);
  } catch {}

  // Best overall “goodbye” event (close/reload/nav/BFCache)
  window.addEventListener("pagehide", kill, { capture: true });

  // Still useful on many desktops
  window.addEventListener("beforeunload", kill, { capture: true });

  // Mobile/Safari: when tab/app goes background
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") kill();
    },
    { capture: true }
  );

  // Chrome/Edge page lifecycle: discard/freeze
  (document as any).addEventListener?.("freeze", kill, { capture: true });

  return () => {
    __autoClearInstalled = false;
    window.removeEventListener("pagehide", kill, { capture: true } as any);
    window.removeEventListener("beforeunload", kill, { capture: true } as any);
    document.removeEventListener(
      "visibilitychange",
      kill as any,
      { capture: true } as any
    );
    (document as any).removeEventListener?.("freeze", kill, { capture: true });
  };
}


/* ───────────────────────── Errors/Fetch ───────────────────────── */

const DEFAULT_TIMEOUT_MS =
  Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 20000);

/** Combine multiple AbortSignals and propagate the *first* reason. */
function combineSignals(signals: AbortSignal[] = []) {
  const controller = new AbortController();

  const onAbort = (ev: Event) => {
    const src = ev.target as AbortSignal;
    try {
      controller.abort((src as any).reason ?? "parent-abort");
    } catch {
      controller.abort();
    }
  };

  let aborted = false;
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      aborted = true;
      try {
        controller.abort((s as any).reason ?? "parent-abort");
      } catch {
        controller.abort();
      }
      break;
    }
  }
  if (!aborted) {
    for (const s of signals) {
      if (!s) continue;
      s.addEventListener("abort", onAbort, { once: true });
    }
  }

  const cleanup = () => {
    for (const s of signals) {
      try {
        (s as any).removeEventListener?.("abort", onAbort);
      } catch {}
    }
  };

  return { signal: controller.signal, cleanup };
}

async function coreFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number }
) {
  ensureParsable(url);

  const timeoutCtrl = new AbortController();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const timer =
    timeoutMs > 0
      ? setTimeout(
          () => timeoutCtrl.abort(new Error(`timeout:${timeoutMs}ms`)),
          timeoutMs
        )
      : null;

  const { signal, cleanup } = combineSignals(
    [init.signal, timeoutCtrl.signal].filter(Boolean) as AbortSignal[]
  );

  try {
    const res = await fetch(url, { ...init, signal });
    const ct = res.headers.get("content-type") || "";
    const isJson = /\bjson\b/i.test(ct); // supports application/json and +json
    const text = await res.text().catch(() => "");
    const data = isJson
      ? (() => {
          try {
            return text ? JSON.parse(text) : null;
          } catch {
            return null;
          }
        })()
      : null;

    return { res, data, text, ct };
  } finally {
    if (timer) clearTimeout(timer);
    cleanup();
  }
}

/** Accepts either an Error or a `{ ok:false, status }`-like object */
function isRetryable(err: any) {
  if (!err) return false;

  // If it's our structured failure object from requestSafe
  if (typeof err === "object" && "ok" in err && err.ok === false) {
    return typeof err.status === "number" && err.status >= 500;
  }

  // Abort/network errors
  if (err?.name === "AbortError") return true;
  if (err instanceof TypeError) return true;
  if (
    typeof err?.message === "string" &&
    /network|timeout/i.test(err.message)
  )
    return true;

  // HTTP 5xx wrapped in ApiError
  if (err instanceof ApiError && err.status >= 500) return true;

  return false;
}

/* ───────────────────────── Request helpers ───────────────────────── */
export async function request<T = any>(path: string, opts: ReqOpts = {}) {
  const method = (opts.method || "GET") as Method;
  const payload = opts.json ?? opts.body;
  const hasBody = payload !== undefined && payload !== null;

  // Build headers (+ auto Idempotency for mutating verbs)
  const headers: Record<string, string> = {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };

  // ✅ Inject bearer token if present (case-insensitive guard)
  const token = getToken();
  const hasAuthHeader = Object.keys(headers).some(
    (k) => k.toLowerCase() === "authorization"
  );
  if (token && !hasAuthHeader) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (method !== "GET" && method !== "DELETE") {
    const wantIdem =
      opts.idempotency === false
        ? null
        : typeof opts.idempotency === "string"
        ? opts.idempotency
        : headers["Idempotency-Key"]
        ? null
        : typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).slice(2);
    if (wantIdem) headers["Idempotency-Key"] = wantIdem;
  }

  const url = joinApi(path);
  if (typeof window !== "undefined") console.log("[API]", method, url);

  const attempt = async () => {
    try {
      const { res, data, text } = await coreFetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(payload) : undefined,
        cache: opts.cache ?? "no-store",
        credentials: opts.credentials ?? "include",
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        signal: opts.signal,
      });

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          text ||
          `HTTP ${res.status}`;
        throw new ApiError(msg, res.status, url, data ?? text);
      }
      return (data as T) ?? ({} as T);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new ApiError(
          `Request timed out after ${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`,
          0,
          url
        );
      }
      throw e;
    }
  };

  try {
    return await attempt();
  } catch (e) {
    if (isRetryable(e)) {
      return await attempt();
    }
    throw e;
  }
}

export async function requestSafe<T = any>(
  path: string,
  opts: ReqOpts = {}
): Promise<
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; body?: any }
> {
  try {
    const method = (opts.method || "GET") as Method;
    const payload = opts.json ?? opts.body;
    const hasBody = payload !== undefined && payload !== null;

    const headers: Record<string, string> = {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...((opts.headers as Record<string, string>) || {}),
    };

    // ✅ Inject bearer token if present
    const token = getToken();
    const hasAuthHeader = Object.keys(headers).some(
      (k) => k.toLowerCase() === "authorization"
    );
    if (token && !hasAuthHeader) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (method !== "GET" && method !== "DELETE") {
      const wantIdem =
        opts.idempotency === false
          ? null
          : typeof opts.idempotency === "string"
          ? opts.idempotency
          : headers["Idempotency-Key"]
          ? null
          : typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : Math.random().toString(36).slice(2);
      if (wantIdem) headers["Idempotency-Key"] = wantIdem;
    }

    const url = joinApi(path);

    const exec = async () => {
      const { res, data, text } = await coreFetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(payload) : undefined,
        cache: opts.cache ?? "no-store",
        credentials: opts.credentials ?? "include",
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        signal: opts.signal,
      });
      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          text ||
          `HTTP ${res.status}`;
        return {
          ok: false as const,
          error: msg,
          status: res.status,
          body: data ?? text,
        };
      }
      return {
        ok: true as const,
        data: (data as T) ?? ({} as T),
        status: res.status,
      };
    };

    const first = await exec();
    if (!first.ok && isRetryable(first)) {
      return await exec();
    }
    return first;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return { ok: false, error: "Request timed out", status: 0 };
    }
    return { ok: false, error: e?.message || "Network error", status: 0 };
  }
}

export async function requestRaw(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
) {
  const url = joinApi(path);
  if (typeof window !== "undefined")
    console.log("[API RAW]", init.method || "GET", url);

  const timeoutCtrl = new AbortController();
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer =
    timeoutMs > 0
      ? setTimeout(
          () => timeoutCtrl.abort(new Error(`timeout:${timeoutMs}ms`)),
          timeoutMs
        )
      : null;

  const { signal, cleanup } = combineSignals(
    [init.signal, timeoutCtrl.signal].filter(Boolean) as AbortSignal[]
  );

  // ✅ Add token to raw requests too (if caller didn’t set auth)
  const rawHeaders: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  const hasAuthHeader = Object.keys(rawHeaders).some(
    (k) => k.toLowerCase() === "authorization"
  );
  if (token && !hasAuthHeader) {
    rawHeaders.Authorization = `Bearer ${token}`;
  }

  ensureParsable(url);
  try {
    return await fetch(url, {
      cache: "no-store",
      credentials: "include",
      signal,
      ...init,
      headers: rawHeaders,
    });
  } finally {
    if (timer) clearTimeout(timer);
    cleanup();
  }
}

/* ───────────────────────── Users / helpers ───────────────────────── */
function normalizeMe<T extends { user?: any }>(data: T | any) {
  if (!data) return { user: null } as any;
  const user = data.user ?? data;
  return { ...data, user };
}

export async function meUser() {
  // Keep canonical: /users/me (server mirrors /auth/me too, but /users/me is primary)
  const raw = await request("/users/me");
  const { user } = normalizeMe(raw);
  return user;
}

/* ─────────────────── Outbound payload normalizer ─────────────────── */

/** Parse common money inputs into a number. */
function parseMoneyToNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const num = parseFloat(v.replace(/[, ]/g, ""));
    return isFinite(num) ? num : 0;
  }
  const val = v.value ?? v.amount ?? v.usd ?? v.valueUSD ?? 0;
  return parseMoneyToNumber(val);
}

/** Prefer explicit string fields, then object fields (if present). */
function coalesceNameFrom(
  p: any,
  hasRecipientObject: boolean
): string | undefined {
  const direct =
    (typeof p?.recipientName === "string" && p.recipientName) ||
    (typeof p?.["Recipient Name"] === "string" && p["Recipient Name"]) ||
    (typeof p?.recipient_name === "string" && p.recipient_name) ||
    (hasRecipientObject
      ? p?.recipient?.name ??
        p?.recipient?.tag ??
        p?.recipient?.email ??
        p?.recipient?.phone ??
        undefined
      : undefined) ||
    (p?.firstName || p?.lastName
      ? `${p?.firstName ?? ""} ${p?.lastName ?? ""}`
      : undefined) ||
    (typeof p?.name === "string" && p.name) ||
    undefined;

  const cleaned =
    typeof direct === "string" ? direct.replace(/\s+/g, " ").trim() : undefined;
  return cleaned && cleaned.length ? cleaned : undefined;
}

/**
 * IMPORTANT: Do **not** synthesize `recipient:{}` unless the caller provided one.
 * This prevents accidental `.trim()` calls on objects in backend code.
 */
function normalizeOutboundPayload(raw: any) {
  const src = raw || {};
  const p: any = { ...src };

  const hasRecipientObject =
    p.recipient &&
    typeof p.recipient === "object" &&
    !Array.isArray(p.recipient);

  const name = coalesceNameFrom(p, hasRecipientObject);

  if (hasRecipientObject) {
    // Keep it an object (caller chose object mode)
    p.recipient = { ...p.recipient };

    // Ensure a name exists on both object and alias fields
    if (name) {
      p.recipient.name = name;
      p.recipientName = name;
      (p as any)["Recipient Name"] = name;
      p.recipient_name = name;
    }

    // Common alias shims (only when in object mode)
    if (!p.recipient.routingNumber) {
      p.recipient.routingNumber =
        p.recipient.routingNumber ??
        p.routingNumber ??
        p.routing ??
        p.aba ??
        undefined;
    }
    if (!p.recipient.accountNumber) {
      p.recipient.accountNumber =
        p.recipient.accountNumber ??
        p.accountNumber ??
        p.account ??
        p.acctNumber ??
        undefined;
    }
    if (!p.recipient.bankName) {
      p.recipient.bankName = p.recipient.bankName ?? p.bankName ?? undefined;
    }

    // Address shims
    p.recipient.address = { ...(p.recipient.address || {}) };
    p.recipient.address.street1 =
      p.recipient.address.street1 ??
      p.street1 ??
      p.addressLine1 ??
      p.address1 ??
      undefined;
    p.recipient.address.city = p.recipient.address.city ?? p.city ?? undefined;
    p.recipient.address.state =
      p.recipient.address.state ?? p.state ?? p.stateUS ?? undefined;
    p.recipient.address.postalCode =
      p.recipient.address.postalCode ??
      p.zip ??
      p.postalCode ??
      undefined;
    p.recipient.address.country =
      p.recipient.address.country ?? p.country ?? p.recipientCountry ?? "US";
  } else {
    // STRING MODE: caller did NOT provide an object → never send `recipient:{}`

    delete p.recipient;

    if (name) {
      p.recipientName = name;
      (p as any)["Recipient Name"] = name;
      p.recipient_name = name;
    } else {
      delete p.recipientName;
      delete (p as any)["Recipient Name"];
      delete p.recipient_name;
    }
  }

  // Delivery normalization
  if (p.delivery) {
    const d = String(p.delivery).toUpperCase();
    if (["WIRE", "ACH", "SAME_DAY_ACH"].includes(d)) p.delivery = d;
  }

  // Amount normalization
  const currency = p.currency || p.amount?.currency || "USD";
  const asNumber = parseMoneyToNumber(
    p.amount ?? p.usd ?? p.value ?? p.amountValue ?? p.amountUSD
  );
  p.amount = asNumber;
  p.currency = currency;

  // Rail hint defaulting
  if (!p.rail && p.delivery === "WIRE") p.rail = "usa";

  return p;
}

/* ───────────────── Endpoint resolver (generic) ───────────────── */
function resolveTransferEndpoint(p: any): string {
  const looksDeposit = ["deposit", "add_money", "addmoney"].includes(
    String(p?.type || p?.intent || p?.rail || "").toLowerCase()
  );
  if (looksDeposit) return "/transfer/deposit";

  const rail = String(p?.rail || p?.method || p?.type || "").toLowerCase();
  const action = String(p?.action || p?.op || "").toLowerCase();

  if (rail === "zelle") return "/transfer/zelle";
  if (rail === "usa") return "/transfer/usa";
  if (rail === "paypal") return "/transfer/paypal";
  if (rail === "revolut") return "/transfer/revolut";
  if (rail === "cashapp") return "/transfer/cashapp";
  if (rail === "alipay") return "/transfer/alipay";
  if (rail === "billpay") return "/transfer/billpay";
  if (rail === "international") return "/transfer/international";
  if (rail === "venmo") return "/transfer/venmo";
  if (rail === "wise") return "/transfer/wise";
  if (rail === "wechat" || rail === "weixin") return "/transfer/wechat";

  if (rail === "crypto") {
    if (action === "buy") return "/transfer/crypto/buy";
    if (action === "swap") return "/transfer/crypto/swap";
    if (action === "send") return "/transfer/crypto/send";
  }

  const delivery = String(p?.delivery || "").toUpperCase();
  if (["WIRE", "ACH", "SAME_DAY_ACH"].includes(delivery)) return "/transfer/usa";

  return "/transfer/usa";
}

/* ─────────────── Avatar helpers (Cloudinary unsigned) ─────────────── */
/**
 * Upload a File directly to Cloudinary using an **unsigned** preset.
 * Returns the secure URL. No cookies/credentials required.
 */
export async function uploadAvatarUnsigned(
  file: File,
  opts?: { folder?: string; transformation?: string }
): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET;

  if (!cloud || !preset) {
    throw new ApiError(
      "Cloudinary env not set (NEXT_PUBLIC_CLOUDINARY_CLOUD / NEXT_PUBLIC_CLOUDINARY_PRESET).",
      0,
      "cloudinary"
    );
  }
  if (!(file instanceof File)) {
    throw new ApiError("uploadAvatarUnsigned: expected a File", 0, "cloudinary");
  }
  if (!/^image\//.test(file.type)) {
    throw new ApiError(
      "Please upload an image file (png/jpg/webp).",
      0,
      "cloudinary"
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError("Max avatar size is 5MB.", 0, "cloudinary");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
  const fd = new FormData();
  fd.set("file", file);
  fd.set("upload_preset", preset);
  if (opts?.folder) fd.set("folder", opts.folder);
  if (opts?.transformation) fd.set("transformation", opts.transformation);
  // You can also rely on the preset’s incoming transformation:
  // e.g., c_fill,g_face,w_256,h_256,q_auto,f_auto

  const res = await fetch(endpoint, { method: "POST", body: fd });
  const json = await res.json().catch(() => null as any);

  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `Cloudinary upload failed (${res.status})`;
    throw new ApiError(msg, res.status, endpoint, json);
  }

  const url = json?.secure_url || json?.url;
  if (!url)
    throw new ApiError(
      "Upload succeeded but no URL returned.",
      res.status,
      endpoint,
      json
    );
  return String(url);
}

/* ─────────────────────────────── API ─────────────────────────────── */
export const API = {
  /* OTP/Auth */
  sendOtp: (email: string) =>
    request("/auth/otp/send", { method: "POST", json: { email } }),
  verifyOtp: (email: string, code: string) =>
    request("/auth/otp/verify", { method: "POST", json: { email, code } }),

  signup: (payload: any) =>
    request("/auth/signup", { method: "POST", json: payload }),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", json: { email, password } }),
  pinLogin: (email: string, pin: string) =>
    request("/auth/pin/login", { method: "POST", json: { email, pin } }),

  // 🔐 Forgot password flow
  // Low-level/legacy helpers (OTP + token)
  forgotPassword: (email: string) =>
    request("/auth/forgot-password", {
      method: "POST",
      json: { email },
    }),
  verifyResetCode: (email: string, code: string) =>
    request("/auth/verify-reset-code", {
      method: "POST",
      json: { email, code },
    }),
  resetPassword: (resetToken: string, newPassword: string) =>
    request("/auth/reset-password", {
      method: "POST",
      json: { resetToken, newPassword },
    }),
  // High-level helpers for link-based UX (what the new page uses)
  requestPasswordReset: (email: string) =>
    request("/auth/forgot-password", {
      method: "POST",
      json: { email },
    }),
  confirmPasswordReset: (payload: {
    email: string;
    token: string;
    password: string;
  }) =>
    request("/auth/reset-password", {
      method: "POST",
      json: { resetToken: payload.token, newPassword: payload.password },
    }),

  pinSet: (pin: string) =>
    request("/auth/pin/set", { method: "POST", json: { pin } }),
  pinVerify: (pin: string) =>
    request("/auth/pin/verify", { method: "POST", json: { pin } }),

  logout: () => request("/auth/logout", { method: "POST" }),

  /* Users/me */
  me: async () => normalizeMe(await request("/users/me")),
  meUser,

  updateMe: (payload: { onboardingStep?: number }) =>
    request("/users/me", { method: "PATCH", json: payload }),

  updateProfile: (payload: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dob?: string;
    address?: {
      street1?: string;
      street2?: string;
      city?: string;
      state?: string;
      stateUS?: string;
      zip?: string;
      postalCode?: string;
    };
    avatarUrl?: string;
  }) => request("/users/me/profile", { method: "PATCH", json: payload }),

  /** Minimal helper for avatars: stores the URL on the profile. */
  saveAvatar: (url: string) =>
    request("/users/me/profile", { method: "PATCH", json: { avatarUrl: url } }),

  saveSecurity: (payload: { pin?: string; passkey?: boolean }) =>
    request("/users/me/security", { method: "POST", json: payload }),

  createAccounts: (payload: {
    checking?: boolean;
    savings?: boolean;
    virtualCard?: boolean;
  }) => request("/users/me/accounts", { method: "POST", json: payload }),

  // ✅ Authoritative balances from dedicated endpoint
  myAccounts: async () => {
    const data = await request("/users/me/accounts");
    // Return either {checking, savings,...} or fallback to nested shape
    return (data as any)?.accounts ?? data;
  },

  achManual: (payload: {
    holder: string;
    bankName: string;
    type: "checking" | "savings";
    routing: string;
    accountNumber: string;
    consent: true;
  }) => request("/users/me/ach/manual", { method: "POST", json: payload }),

  achVerify: (amounts: [number, number]) =>
    request("/users/me/ach/verify", { method: "POST", json: { amounts } }),

  achUnlink: () => request("/users/me/ach", { method: "DELETE" }),

  updatePreferences: (payload: {
    timezone?: string;
    currency?: string;
    notifyEmail?: boolean;
    notifyPush?: boolean;
  }) => request("/users/me/preferences", { method: "PATCH", json: payload }),

  onboardingComplete: () =>
    request("/users/me/onboarding/complete", { method: "POST" }),

  // Wallets
  saveWallets: (payload: {
    btcAddress?: string;
    ethAddress?: string;
    usdtTron?: string;
    usdtEth?: string;
    solAddress?: string;
    notes?: string;
  }) => request("/users/me/wallets", { method: "POST", json: payload }),
  deleteWallet: (symbol: string) =>
    request(`/users/me/wallets/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    }),

  registerDevice: (payload: {
    fingerprint: Record<string, any>;
    trusted?: boolean;
    binding?: { type: "passkey" | "fingerprint" | "face"; [k: string]: any };
  }) =>
    request("/users/me/devices/register", { method: "POST", json: payload }),
  myDevices: () => request("/users/me/devices"),

  /* Insights */
  myInsights: () => request("/users/me/insights"),

  /* Prices (served by Next route /api/prices) */
  getPrices: (ids = "bitcoin", vs = "usd") =>
    request(
      `/prices?ids=${encodeURIComponent(ids)}&vs=${encodeURIComponent(vs)}`
    ),

  /* Transfers (direct create) */
  createZelle: (payload: any) =>
    request("/transfer/zelle", { method: "POST", json: payload }),
  createUsaTransfer: (payload: any) =>
    request("/transfer/usa", { method: "POST", json: payload }),
  createPayPal: (payload: any) =>
    request("/transfer/paypal", { method: "POST", json: payload }),
  createRevolut: (payload: any) =>
    request("/transfer/revolut", { method: "POST", json: payload }),
  createCashApp: (payload: any) =>
    request("/transfer/cashapp", { method: "POST", json: payload }),
  createAlipay: (payload: any) =>
    request("/transfer/alipay", { method: "POST", json: payload }),
  createBillPay: (payload: any) =>
    request("/transfer/billpay", { method: "POST", json: payload }),
  createInternational: (payload: any) =>
    request("/transfer/international", { method: "POST", json: payload }),

  /* Crypto */
  createCryptoBuy: (payload: any) =>
    request("/transfer/crypto/buy", { method: "POST", json: payload }),
  createCryptoSwap: (payload: any) =>
    request("/transfer/crypto/swap", { method: "POST", json: payload }),
  createCryptoSend: (payload: any) =>
    request("/transfer/crypto/send", { method: "POST", json: payload }),

  /* Alt rails */
  createVenmo: (payload: any) =>
    request("/transfer/venmo", { method: "POST", json: payload }),
  createWise: (payload: any) =>
    request("/transfer/wise", { method: "POST", json: payload }),
  createWeChat: (payload: any) =>
    request("/transfer/wechat", { method: "POST", json: payload }),

  /* OTP confirm for a transfer */
  verifyTransferOtp: (referenceId: string, code: string) =>
    request(`/transfers/${encodeURIComponent(referenceId)}/confirm`, {
      method: "POST",
      json: { otp: code },
    }),

  /* Deposits / Initiate */
  createDeposit: (payload: any) =>
    request("/transfer/deposit", { method: "POST", json: payload }),

  initiateDeposit: (payload: any) =>
    request("/transfer/initiate", { method: "POST", json: payload }),

  /**
   * Generic initiator that resolves the correct rail.
   * Ensures we DO NOT send a synthesized `recipient:{}` in string mode.
   */
  initiateTransfer: async (payload: any) => {
    const normalized = normalizeOutboundPayload(payload);

    if (
      normalized.recipient &&
      typeof normalized.recipient === "object" &&
      !(payload && typeof payload.recipient === "object")
    ) {
      delete normalized.recipient;
    }

    const nameStr =
      (typeof normalized.recipientName === "string" &&
        normalized.recipientName.trim()) ||
      (typeof normalized["Recipient Name"] === "string" &&
        (normalized as any)["Recipient Name"].trim()) ||
      (typeof normalized.recipient_name === "string" &&
        normalized.recipient_name.trim()) ||
      (normalized.recipient &&
        typeof normalized.recipient === "object" &&
        typeof normalized.recipient.name === "string" &&
        normalized.recipient.name.trim()) ||
      "";

    if (!nameStr) {
      throw new ApiError("Recipient name required", 400, "/transfer/*");
    }

    const path = resolveTransferEndpoint(normalized);
    if (typeof window !== "undefined")
      console.log("[API→]", path, normalized);
    return request(path, { method: "POST", json: normalized });
  },

  /* Pending & summary */
  getPendingByRef: (referenceId: string) =>
    request(`/transfer/pending/${encodeURIComponent(referenceId)}`),
  getTransferSummary: (referenceId: string) =>
    request(`/transfer/summary/${encodeURIComponent(referenceId)}`),
  receiptPdf: (id: string) =>
    requestRaw(`/transfer/${encodeURIComponent(id)}/receipt.pdf`, {
      method: "GET",
    }),

  /* Admin */
  listUsersAdmin: () => request("/admin/users"),
  getUserAdmin: (id: string) =>
    request(`/admin/users/${encodeURIComponent(id)}`),
  patchUserAdmin: (id: string, json: any) =>
    request(`/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json,
    }),
  deleteUserAdmin: (id: string) =>
    request(`/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  adminOverview: () => request("/admin/overview"),
  adminReports: () => request("/admin/reports"),

  adminListTransfers: () => request("/admin/transfers"),
  adminGetTransfer: (id: string) =>
    request(`/admin/transfers/${encodeURIComponent(id)}`),
  adminApproveTransfer: (id: string) =>
    request(`/admin/transfers/${encodeURIComponent(id)}/approve`, {
      method: "POST",
    }),
  adminRejectTransfer: (id: string) =>
    request(`/admin/transfers/${encodeURIComponent(id)}/reject`, {
      method: "POST",
    }),
  adminListTransactions: () => request("/admin/transactions"),

  // Notifications (ADMIN)
  adminListNotifications: () => request("/admin/notifications"),
  adminCreateNotification: (json: any) =>
    request("/admin/notifications", { method: "POST", json }),
  adminUpdateNotification: (id: string, json: any) =>
    request(`/admin/notifications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json,
    }),
  adminDeleteNotification: (id: string) =>
    request(`/admin/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  adminGetConfig: () => request("/admin/config"),
  adminUpdateConfig: (json: any) =>
    request("/admin/config/update", { method: "POST", json }),
  adminGetAuditLogs: () => request("/admin/audit/logs"),

  /* Notifications (USER) — canonical under /users/me */
  myNotifications: () =>
    request<{ items: any[] }>("/users/me/notifications"),
  markNotificationRead: (id: string) =>
    request(`/users/me/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    }),
  markAllNotificationsRead: () =>
    request("/users/me/notifications/mark-all-read", {
      method: "POST",
    }),

  /**
   * Backward-compat wrapper that *tries* /users/me/notifications first,
   * then falls back to legacy /notifications if present.
   */
  getNotifications: async (opts?: { limit?: number; after?: string }) => {
    try {
      return await request<{ items: any[] }>("/users/me/notifications");
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
        const q = new URLSearchParams();
        if (opts?.limit) q.set("limit", String(opts.limit));
        if (opts?.after) q.set("after", opts.after);
        const qs = q.toString() ? `?${q.toString()}` : "";
        return await request(`/notifications${qs}`);
      }
      throw e;
    }
  },
};

/* ───────────────────── Pending handoff helpers ───────────────────── */
export function saveLastTransfer(payload: Record<string, any>) {
  try {
    localStorage.setItem("last_transfer", JSON.stringify(payload));
  } catch {}
}

export function goToPending(router: { push: (p: string) => void }, ref: string) {
  // Keep original pathing if your app expects capital T; otherwise prefer lowercase
  router.push(`/Transfer/pending?ref=${encodeURIComponent(ref)}`);
}

export function afterCreateTransfer(router: any, result: any) {
  const refId =
    result?.referenceId ||
    result?.ref ||
    result?.id ||
    result?.otpRef ||
    result?.otp?.refId;
  saveLastTransfer({
    status: result?.status || "pending",
    rail: result?.rail || result?.type,
    amount:
      result?.amount && typeof result?.amount === "object"
        ? result?.amount
        : {
            value: result?.amount ?? result?.usd ?? result?.value ?? 0,
            currency: result?.currency || "USD",
          },
    fees: result?.fees,
    sender: result?.sender,
    recipient: result?.recipient,
    referenceId: refId,
    createdAt: new Date().toISOString(),
    note: result?.note,
  });
  goToPending(router, refId);
}

export async function meBalances() {
  // Prefer dedicated endpoint when available, else fall back to /users/me shape
  try {
    const acc = await API.myAccounts();
    const checking =
      Number(acc?.checking?.available ?? acc?.checking ?? 0) || 0;
    const savings = Number(acc?.savings?.available ?? acc?.savings ?? 0) || 0;
    return { checking, savings };
  } catch {
    const data = await API.me();
    const u: any = (data as any)?.user ?? data;
    return u?.balances ?? { checking: 0, savings: 0 };
  }
}

export async function meDisplayName() {
  const data = await API.me();
  const u: any = (data as any)?.user ?? data;
  const full =
    [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
    u?.fullName ||
    u?.handle ||
    "User";
  return full;
}

/* ───────────────────── Re-exports for convenience ───────────────────── */
export const createZelle = API.createZelle;
export const createUsaTransfer = API.createUsaTransfer;
export const createPayPal = API.createPayPal;
export const createRevolut = API.createRevolut;
export const createCashApp = API.createCashApp;
export const createAlipay = API.createAlipay;
export const createBillPay = API.createBillPay;
export const createInternational = API.createInternational;
export const sendOtp = API.sendOtp;
export const verifyOtp = API.verifyOtp;

export const createVenmo = API.createVenmo;
export const createWise = API.createWise;
export const createWeChat = API.createWeChat;

export const createCryptoBuy = API.createCryptoBuy;
export const createCryptoSwap = API.createCryptoSwap;
export const createCryptoSend = API.createCryptoSend;

export const initiateTransfer = API.initiateTransfer;
export const initiateDeposit = API.initiateDeposit;
export const createDeposit = API.createDeposit;
export const me = API.me;
export const myAccounts = API.myAccounts;
export const verifyTransferOtp = API.verifyTransferOtp;
export const getPendingByRef = API.getPendingByRef;
export const getTransferSummary = API.getTransferSummary;

export const myNotifications = API.myNotifications;
export const markAllNotificationsRead = API.markAllNotificationsRead;
export const getNotifications = API.getNotifications;
export const markNotificationRead = API.markNotificationRead;

export const adminListNotifications = API.adminListNotifications;
export const adminCreateNotification = API.adminCreateNotification;
export const adminUpdateNotification = API.adminUpdateNotification;
export const adminDeleteNotification = API.adminDeleteNotification;

/* avatar convenience exports */
export const saveAvatar = API.saveAvatar;

/* Forgot-password convenience exports */
export const forgotPassword = API.forgotPassword;
export const verifyResetCode = API.verifyResetCode;
export const resetPassword = API.resetPassword;
export const requestPasswordReset = API.requestPasswordReset;
export const confirmPasswordReset = API.confirmPasswordReset;

export default API;
