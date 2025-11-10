// apps/web/libs/fp.ts
// Device fingerprint + registration helper (FE side)
// Call registerThisDevice() only AFTER a session is established (OTP/PIN/login)

import API from "@/libs/api";

type DeviceBindings = unknown[] | undefined;

export function collectFingerprint() {
  if (typeof window === "undefined") {
    return {
      userAgent: "ssr",
      platform: "ssr",
      browser: "ssr",
      screen: "0x0@1.00",
      timezone: "UTC",
      language: "en",
      touchSupport: false,
    };
  }

  const d = (window.devicePixelRatio || 1);
  // @ts-ignore optional UA-CH
  const brands = (navigator as any).userAgentData?.brands as { brand: string; version: string }[] | undefined;

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    browser: Array.isArray(brands) ? brands.map((b) => `${b.brand} ${b.version}`).join(", ") : undefined,
    screen: `${window.screen.width}x${window.screen.height}@${d.toFixed(2)}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    touchSupport: "ontouchstart" in window,
  };
}

/** Call AFTER session is established (post-OTP or post-PIN). Safe no-op on error. */
export async function registerThisDevice(binding?: any) {
  try {
    // avoid SSR execution
    if (typeof window === "undefined") return;

    const details = collectFingerprint();
    await API.registerDevice({
      details,
      bindings: binding ? [binding] : ([] as DeviceBindings),
    });
  } catch (e) {
    // don't block UX if device registration fails
    // eslint-disable-next-line no-console
    console.warn("[fp] registerThisDevice failed:", e);
  }
}
