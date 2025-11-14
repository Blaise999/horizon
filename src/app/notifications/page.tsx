// app/notification/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/app/dashboard/dashboardnav";
import {
  Bell,
  CheckCircle2,
  Trash2,
  Eye,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import {
  getNotifications as apiGetNotifications,
  markNotificationRead as apiMarkNotificationRead,
} from "@/libs/api"; // ✅ unified API client

/* -------------------------------------------------------------------------- */
/* Types (mirror backend notify payloads)                                     */
/* -------------------------------------------------------------------------- */
type Json = Record<string, any>;

export type BackendNotification = {
  _id: string; // id
  userId?: string;
  kind: string; // e.g., transfer_pending, transfer_completed
  title: string;
  message?: string;
  meta?: Json; // { referenceId, rail, to, amount, currency, status, ... }
  route?: string; // optional deep link from backend
  preview?: { type?: string; amount?: number; to?: string };
  createdAt: string; // ISO
  readAt?: string | null; // backend timestamp if read
  // Local convenience (computed):
  read?: boolean;
};

type FilterKey = "all" | "unread";

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Decide where a notification should deep-link.
 * - Prefer backend-provided route
 * - Else choose /Transfer/pending or /Transfer/success based on kind/status
 * - Fallback: generic status page
 */
function toRoute(n: BackendNotification) {
  // 1) Explicit route wins
  const explicit = (n as any).route as string | undefined;
  if (explicit) return explicit;

  // 2) Extract reference
  const ref =
    n.meta?.referenceId ||
    n.meta?.ref ||
    (n as any).referenceId ||
    (n as any).ref;

  if (!ref) {
    // last resort: a generic notification detail page
    return `/dashboard/notifications/${encodeURIComponent(n._id)}`;
  }

  const kind = (n.kind || "").toLowerCase();
  const status = String(n.meta?.status || "").toUpperCase();

  // 3) Pending-style notifications
  const isPending =
    kind.includes("pending") ||
    kind.includes("otp_required") ||
    status === "PENDING_ADMIN" ||
    status === "OTP_REQUIRED" ||
    status === "SCHEDULED";

  if (isPending) {
    return `/Transfer/pending?ref=${encodeURIComponent(ref)}`;
  }

  // 4) Completed-style notifications
  const isCompleted =
    kind.includes("completed") ||
    kind.includes("success") ||
    status === "COMPLETED";

  if (isCompleted) {
    return `/Transfer/success?ref=${encodeURIComponent(ref)}`;
  }

  // 5) Fallback to neutral status page
  return `/Transfer/status?ref=${encodeURIComponent(ref)}`;
}

function normalizeOne(raw: any): BackendNotification {
  const readFlag =
    typeof raw.read === "boolean"
      ? raw.read
      : raw.readAt
      ? Boolean(raw.readAt)
      : false;
  return {
    _id: String(raw._id ?? raw.id ?? cryptoRandomId()),
    userId: raw.userId,
    kind: String(raw.kind ?? "update"),
    title: String(raw.title ?? "Notification"),
    message: typeof raw.message === "string" ? raw.message : undefined,
    meta: raw.meta ?? {},
    route: raw.route,
    preview: raw.preview,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    readAt: raw.readAt ?? null,
    read: readFlag,
  };
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    // @ts-ignore
    return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function NotificationPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [setupPercent, setSetupPercent] = useState<number | undefined>(
    undefined
  );

  const [items, setItems] = useState<BackendNotification[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // simple cursor = last item's createdAt ISO (backend supports ?after=<cursor> if implemented)
  const [cursorAfter, setCursorAfter] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadAbort = useRef<AbortController | null>(null);
  const sentryRef = useRef<HTMLDivElement | null>(null);

  // "special something" — pulse & sparkle when new notifications arrive
  const [burstCount, setBurstCount] = useState(0);
  const [showBurstChip, setShowBurstChip] = useState(false);
  const lastTopTsRef = useRef<string | null>(null);

  /* -------------------------------- Bootstrap ----------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    setUserName(localStorage.getItem("hb_user_name") || "User");
    const s = localStorage.getItem("hb_setup_percent");
    if (s) setSetupPercent(Number(s));
  }, []);

  useEffect(() => {
    // initial fetch
    void refreshList();
    // refresh on tab focus so users catch fresh notifs naturally
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshList(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ Data Fetching --------------------------- */
  const fetchPage = useCallback(
    async ({ after }: { after?: string } = {}) => {
      setError(null);
      const limit = 20;
      try {
        const data = await apiGetNotifications({
          limit,
          after: after ?? undefined,
        });
        // The wrapper may return {items} or a plain array. Normalize both.
        const rawArray: any[] = Array.isArray(data)
          ? data
          : (data?.items ?? []);
        const arr: BackendNotification[] = rawArray.map(normalizeOne);
        const nextAfter: string | null = Array.isArray(data)
          ? arr.length
            ? arr[arr.length - 1]?.createdAt
            : null
          : data?.nextAfter ?? null;

        return { arr, nextAfter };
      } catch (e: any) {
        setError(e?.message || "Failed to load notifications");
        return { arr: [] as BackendNotification[], nextAfter: null };
      }
    },
    []
  );

  const triggerBurst = useCallback((count: number) => {
    if (count <= 0) return;
    setBurstCount(count);
    setShowBurstChip(true);

    // Gentle haptic (if supported)
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(50);
      }
    } catch {}

    // Soft chime using WebAudio API (no external assets)
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880; // A5
      g.gain.value = 0.001; // subtle
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      // quick up-down envelope
      const now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      o.stop(now + 0.3);
    } catch {}
    // Auto hide chip after a few seconds
    setTimeout(() => setShowBurstChip(false), 3500);
  }, []);

  const refreshList = useCallback(
    async (isPassiveFocus?: boolean) => {
      setRefreshing(true);
      setInitialLoading((v) => (isPassiveFocus ? v : true));
      setHasMore(true);
      setCursorAfter(null);
      loadAbort.current?.abort();
      loadAbort.current = new AbortController();

      try {
        const { arr, nextAfter } = await fetchPage({});
        setItems(arr);
        setCursorAfter(nextAfter);
        setHasMore(Boolean(nextAfter) || arr.length >= 20);

        // Detect "new" vs previous top timestamp to trigger the sparkle/pulse
        const newTopTs = arr[0]?.createdAt ?? null;
        const prevTopTs = lastTopTsRef.current;
        if (prevTopTs && newTopTs && newTopTs > prevTopTs) {
          // count new items by createdAt greater than prevTopTs
          const burst = arr.filter((n) => n.createdAt > prevTopTs).length;
          triggerBurst(burst);
        }
        lastTopTsRef.current = newTopTs;
      } finally {
        setRefreshing(false);
        setInitialLoading(false);
      }
    },
    [fetchPage, triggerBurst]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { arr, nextAfter } = await fetchPage({
        after: cursorAfter ?? undefined,
      });
      setItems((prev) => [...prev, ...arr]);
      setCursorAfter(nextAfter);
      setHasMore(Boolean(nextAfter) || arr.length >= 20);
    } finally {
      setLoadingMore(false);
    }
  }, [cursorAfter, fetchPage, hasMore, loadingMore]);

  /* ---------------------------- Infinite Scroll --------------------------- */
  useEffect(() => {
    if (!sentryRef.current) return;
    const el = sentryRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (e.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "400px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  /* --------------------------- Derived + Handlers ------------------------- */
  const filtered = useMemo(
    () => (filter === "unread" ? items.filter((i) => !i.read) : items),
    [items, filter]
  );

  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items]
  );

  async function onOpen(n: BackendNotification) {
    await markOneRead(n._id, { optimisticOnly: true });
    const route = toRoute(n);
    router.push(route);
  }

  async function markOneRead(
    id: string,
    opts?: { optimisticOnly?: boolean }
  ) {
    setItems((prev) =>
      prev.map((i) =>
        i._id === id ? { ...i, read: true, readAt: new Date().toISOString() } : i
      )
    );
    if (opts?.optimisticOnly) return;

    try {
      await apiMarkNotificationRead(id);
    } catch {
      setItems((prev) =>
        prev.map((i) => (i._id === id ? { ...i, read: false, readAt: null } : i))
      );
    }
  }

  async function onMarkAllSeen() {
    const toMark = items.filter((i) => !i.read).map((i) => i._id);
    if (!toMark.length) return;
    // optimistic
    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => (i.read ? i : { ...i, read: true, readAt: nowIso }))
    );
    await Promise.allSettled(toMark.map((id) => apiMarkNotificationRead(id)));
  }

  function onRemoveLocal(id: string) {
    // If you add a DELETE endpoint later, call it here.
    setItems((prev) => prev.filter((i) => i._id !== id));
  }

  /* --------------------------------- UI ----------------------------------- */

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} setupPercent={setupPercent} />

      <section className="container-x pt-[120px] pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="relative flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-2xl bg-white/10 border border-white/20 grid place-items-center">
                <Bell className="h-5 w-5" />
                {/* Special pulse when there are unread notifications */}
                {unreadCount > 0 && (
                  <>
                    <span className="absolute inline-flex h-9 w-9 rounded-full animate-ping bg-emerald-400/30" />
                    <span className="absolute inline-flex h-9 w-9 rounded-full bg-emerald-400/20" />
                  </>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  Notifications
                  {/* Sparkle chip when new notifs detected on refresh/focus */}
                  {showBurstChip && (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      {burstCount} new
                    </span>
                  )}
                </h1>
                <p className="text-white/70 text-sm">
                  {unreadCount} unread • {items.length} total
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setFilter((f) => (f === "unread" ? "all" : "unread"))
                }
                className={`px-3 py-2 rounded-2xl text-sm inline-flex items-center gap-2 border ${
                  filter === "unread"
                    ? "bg-emerald-500/10 border-emerald-400/40"
                    : "bg-white/10 border-white/20"
                }`}
                title="Toggle unread filter"
              >
                <Eye className="h-4 w-4" />
                {filter === "unread" ? "Showing unread" : "Show unread"}
              </button>

              <button
                onClick={() => {
                  void refreshList();
                }}
                className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm inline-flex items-center gap-2 disabled:opacity-60"
                title="Refresh"
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                onClick={onMarkAllSeen}
                className="px-3 py-2 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 text-sm inline-flex items-center gap-2"
                title="Mark all as read"
              >
                <Eye className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 text-rose-200 text-sm p-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Filter buttons (secondary row for clarity) */}
          <div className="mt-6 flex items-center gap-2 text-sm">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-2 rounded-2xl border ${
                filter === "all"
                  ? "border-white/40 bg-white/10"
                  : "border-white/20 bg-white/5"
              } hover:bg-white/10`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-2 rounded-2xl border ${
                filter === "unread"
                  ? "border-white/40 bg-white/10"
                  : "border-white/20 bg-white/5"
              } hover:bg-white/10`}
            >
              Unread
            </button>
          </div>

          {/* List */}
          <div className="mt-4 space-y-3">
            {/* Skeleton while first paint */}
            {initialLoading && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`sk-${i}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 animate-pulse"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-white/10" />
                      <div className="flex-1 min-w-0">
                        <div className="h-4 w-40 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-64 bg-white/10 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {!initialLoading && filtered.length === 0 ? (
              <div className="text-white/60 text-sm border border-white/15 rounded-2xl p-6 bg-white/5">
                No notifications yet.
              </div>
            ) : (
              filtered.map((n) => {
                const seen = Boolean(n.read ?? n.readAt);
                const amount =
                  n.meta?.amount != null && n.meta?.currency
                    ? new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: n.meta.currency,
                      }).format(Number(n.meta.amount))
                    : null;

                const to = n.meta?.to;
                const ref =
                  n.meta?.referenceId ||
                  (n as any).referenceId ||
                  (n as any).ref;

                // Fancy unread card: subtle gradient frame + glow ring
                const UnreadFrame: React.FC<{ children: React.ReactNode }> = ({
                  children,
                }) => (
                  <div className="rounded-3xl p-[1px] bg-gradient-to-r from-emerald-500/30 via-cyan-400/20 to-emerald-500/30">
                    <div className="rounded-[22px] bg-[#0E131B]">
                      {children}
                    </div>
                  </div>
                );

                const CardInner = (
                  <div
                    className={`p-4 flex items-start gap-4 rounded-2xl border ${
                      seen
                        ? "border-white/15 bg-white/[0.04]"
                        : "border-white/10 bg-white/[0.06]"
                    }`}
                  >
                    <div
                      className={`relative h-10 w-10 rounded-2xl grid place-items-center shrink-0 ${
                        seen
                          ? "bg-white/10 border border-white/20"
                          : "bg-emerald-500/10 border border-emerald-400/40"
                      }`}
                    >
                      <CheckCircle2
                        className={`${
                          seen ? "text-white/70" : "text-emerald-300"
                        }`}
                        size={18}
                      />
                      {!seen && (
                        <span className="absolute inline-flex h-10 w-10 rounded-2xl animate-ping bg-emerald-400/20" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{n.title}</div>
                        {!seen && (
                          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] text-emerald-300">
                            <Sparkles className="h-3 w-3" />
                            New
                          </span>
                        )}
                      </div>

                      {n.message && (
                        <p className="mt-1 text-sm text-white/80 line-clamp-2">
                          {n.message}
                        </p>
                      )}

                      <div className="mt-2 text-xs text-white/60 flex flex-wrap items-center gap-2">
                        {n.kind && (
                          <span className="uppercase tracking-wide">
                            {n.kind}
                          </span>
                        )}
                        {amount && <span>{amount}</span>}
                        {to && <span>→ {to}</span>}
                        <span>• {fmtDateTime(n.createdAt)}</span>
                        {ref && (
                          <span className="opacity-70">
                            Ref: <span className="font-mono">{ref}</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => onOpen(n)}
                          className="px-3 py-2 rounded-xl bg.white/10 border border-white/20 hover:bg-white/15 text-sm inline-flex items-center gap-2"
                        >
                          Open details <ArrowRight size={14} />
                        </button>
                        {!seen && (
                          <button
                            onClick={() => markOneRead(n._id)}
                            className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-xs"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveLocal(n._id)}
                          className="ml-auto px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-xs text-white/70"
                          title="Remove (local)"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div key={n._id}>
                    {seen ? CardInner : <UnreadFrame>{CardInner}</UnreadFrame>}
                  </div>
                );
              })
            )}

            {/* Load more sentinel */}
            {!initialLoading && hasMore && (
              <div
                ref={sentryRef}
                className="h-10 grid place-items-center text-xs text-white/50"
              >
                {loadingMore ? "Loading more…" : "Scroll for more"}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
