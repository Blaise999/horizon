export function collectFingerprint() {
  const d = window.devicePixelRatio || 1;
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    browser: (navigator as any).userAgentData?.brands?.map((b:any)=>`${b.brand} ${b.version}`).join(", "),
    screen: `${window.screen.width}x${window.screen.height}@${d.toFixed(2)}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    touchSupport: "ontouchstart" in window,
  };
}
export async function registerThisDevice(binding?: any) {
  const fingerprint = collectFingerprint();
  await fetch("/api/users/me/devices/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ fingerprint, trusted: true, binding }),
  });
}
