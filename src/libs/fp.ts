// src/libs/fp.ts
import API from "@/libs/api";

export type DeviceFingerprint = {
  userAgent?: string;
  platform?: string;
  browser?: string;
  screen?: string;
  timezone?: string;
  language?: string;
  touchSupport?: boolean;
};

/**
 * Collect a best-effort fingerprint for this device.
 * - Safe to call from client code only
 * - Returns null on the server / non-browser environments
 */
export function collectFingerprint(): DeviceFingerprint | null {
  // Guard for SSR / Node / non-browser environments
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  const d = window.devicePixelRatio || 1;

  const userAgentData = (navigator as any).userAgentData;
  const brands = userAgentData?.brands;

  const browser = Array.isArray(brands)
    ? brands
        .map((b: any) => `${b.brand} ${b.version}`)
        .join(", ")
    : undefined;

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    browser,
    screen: `${window.screen.width}x${window.screen.height}@${d.toFixed(2)}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    touchSupport: "ontouchstart" in window,
  };
}

/**
 * Best-effort device registration. Not part of login routing decisions.
 * Uses the API wrapper so it always hits the correct base with credentials.
 * - Safe to call from client (e.g. inside useEffect)
 * - No-ops on the server or on failure
 */
export async function registerThisDevice(binding?: unknown) {
  const fingerprint = collectFingerprint();
  if (!fingerprint) return; // server or unsupported env: silently skip

  try {
    // You need API.registerDevice implemented in libs/api.ts for this to work
    await (API as any).registerDevice({
      fingerprint,
      trusted: true,
      binding,
    });
  } catch {
    // non-blocking: ignore failures
  }
}
