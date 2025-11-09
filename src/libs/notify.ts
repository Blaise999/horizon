// libs/notify.ts

// ---- Types ---------------------------------------------------------------

export type NotificationPreview = {
  /** e.g. "ach" | "wire_domestic" | "wire_international" | "crypto" | "billpay" | "deposit" */
  type?: string;
  /** e.g. "$1,250.00" */
  amount?: string;
  /** e.g. "Acme LLC" or "Checking (deposit)" */
  to?: string;
};

export type NotificationKind =
  | "transfer"
  | "billpay"
  | "deposit"
  | "add_money"   // alias we accept from callers; normalized to "deposit"
  | "crypto"
  | "system";

export type NotificationItem = {
  id: string;                  // unique id
  title: string;               // "Transfer approved"
  createdAt: string;           // ISO timestamp
  seen: boolean;               // read status
  route: string;               // deep-link to details page
  ref?: string;                // reference id (optional)
  /** canonical category used by the Notifications page filter */
  category?: Exclude<NotificationKind, "add_money">; // stored as "deposit" not "add_money"
  preview?: NotificationPreview;
  meta?: Record<string, any>;
};

// ---- Storage helpers -----------------------------------------------------

const KEY = "hb_notifications";

function read(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as NotificationItem[];
  } catch {
    return [];
  }
}

function write(arr: NotificationItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(arr));
}

// ---- Public API ----------------------------------------------------------

export function listNotifications(): NotificationItem[] {
  return read();
}

/**
 * Low-level push. Use `recordActivity` for convenience.
 */
export function pushNotification(
  item: Omit<NotificationItem, "id" | "createdAt" | "seen">
) {
  const arr = read();

  // prevent duplicates by ref (optional / cheap)
  if (item.ref && arr.some((n) => n.ref === item.ref)) return;

  arr.unshift({
    ...item,
    id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    createdAt: new Date().toISOString(),
    seen: false,
  });

  write(arr);
}

/**
 * Primary helper used across flows (transfers, bill pay, add money, crypto).
 * Accepts flexible fields, builds a NotificationItem, and stores it.
 */
export function recordActivity(args: {
  title?: string;
  kind?: NotificationKind;   // e.g. "transfer" | "billpay" | "deposit" | "add_money" | "crypto"
  type?: string;             // e.g. "ach_standard" | "wire_domestic" | "card_instant" | "crypto"
  amount?: string;           // "$1,000.00"
  to?: string;               // recipient / destination label
  ref?: string;              // reference id
  route?: string;            // deep link to details view
  meta?: Record<string, any>;
}) {
  const {
    title = "Transfer approved",
    kind = "transfer",
    type,
    amount,
    to,
    ref,
    route = ref
      ? `/Transfer/success?ref=${encodeURIComponent(ref)}&noRedirect=1`
      : "/Transfer/success?noRedirect=1",
    meta = {},
  } = args;

  // normalize alias so your UI only sees "deposit"
  const normalizedKind: NotificationItem["category"] =
    kind === "add_money" ? "deposit" : (kind as NotificationItem["category"]);

  pushNotification({
    title,
    route,
    ref,
    category: normalizedKind,
    preview: { type, amount, to },
    meta,
  });
}

// ---- Mutations -----------------------------------------------------------

export function markSeen(id: string) {
  const arr = read();
  const i = arr.findIndex((n) => n.id === id);
  if (i >= 0) {
    arr[i].seen = true;
    write(arr);
  }
}

export function markAllSeen() {
  const arr = read().map((n) => ({ ...n, seen: true }));
  write(arr);
}

export function removeNotification(id: string) {
  const arr = read().filter((n) => n.id !== id);
  write(arr);
}

export function clearAllNotifications() {
  write([]);
}
