// src/libs/fp.ts
import API from "@/libs/api";

export function collectFingerprint() {
  const d = window.devicePixelRatio || 1;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    browser: (navigator as any).userAgentData?.brands
      ?.map((b: any) => `${b.brand} ${b.version}`)
      .join(", "),
    screen: `${window.screen.width}x${window.screen.height}@${d.toFixed(2)}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    touchSupport: "ontouchstart" in window,
  };
}

/**
 * Best-effort device registration. Not part of login routing decisions.
 * Uses the API wrapper so it always hits the correct base with credentials.
 */
export async function registerThisDevice(binding?: any) {
  const fingerprint = collectFingerprint();
  try {
    await API.registerDevice({ fingerprint, trusted: true, binding });
  } catch {
    // non-blocking: ignore failures
  }
}
