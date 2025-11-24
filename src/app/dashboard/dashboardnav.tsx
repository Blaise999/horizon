"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  HelpCircle,
  Bell,
  Search,
  User2,
  Settings,
  CreditCard,
  Plus,
  ArrowRightLeft,
  Landmark,
  Globe2,
  Bitcoin,
  Wallet,
} from "lucide-react";
import { PATHS } from "@/config/routes";
import API, { meUser, request } from "@/libs/api";

/* --------------------------------------------------------------------------
   Dashboard Nav (reworked + data-bound)
   - Auto-loads user (name, setupPercent) from /users/me
   - Auto-loads activities for notificationsCount (fallback to 0)
   - All transfer actions route to /Transfer/transfermethod (hub)
   - Support routes HARD to /dashboard/support (this file)
---------------------------------------------------------------------------- */

export type DashboardNavProps = {
  userName?: string;
  notificationsCount?: number;
  setupPercent?: number;
  /** set false to disable internal fetch of me+activities */
  autoLoad?: boolean;

  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenSupport?: () => void; // kept for compatibility, but support routing is forced
  onOpenCardsManager?: () => void;
  onOpenInsights?: () => void;
  onOpenTransactions?: () => void;
  onOpenGoals?: () => void;
  onOpenRecurring?: () => void;
};

type Activity = {
  id: string;
  createdAt?: string;
  unread?: boolean; // <-- add unread flag (server shape)
  meta?: Record<string, any>;
};

export default function DashboardNav({
  userName: userNameProp,
  notificationsCount: notificationsProp,
  setupPercent: setupProp,
  autoLoad = true,

  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  onOpenSettings,
  onOpenSupport,
  onOpenCardsManager,
  onOpenInsights,
  onOpenTransactions,
  onOpenGoals,
  onOpenRecurring,
}: DashboardNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [transfersOpen, setTransfersOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Live data
  const [userName, setUserName] = useState<string>(userNameProp || "Guest");
  const [setupPercent, setSetupPercent] = useState<number | undefined>(setupProp);
  const [notificationsCount, setNotificationsCount] = useState<number>(notificationsProp ?? 0);

  /* ------------------------------- Data load ------------------------------ */
  useEffect(() => {
    if (!autoLoad) return;

    (async () => {
      try {
        // 1) User
        const u = await meUser(); // { id,..., firstName, fullName, onboardingStatus, setupPercent, ... }
        const name =
          u?.fullName?.trim?.() ||
          [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() ||
          "User";
        setUserName(name);
        if (typeof u?.setupPercent === "number") setSetupPercent(u.setupPercent);

        // 2) Activities → notifications count (use server `unread` flag)
        try {
          const acts = await request<{ items: Activity[] }>("/users/me/activities");
          const list = Array.isArray(acts?.items) ? acts.items : [];
          const unread = list.filter((a) => a.unread === true).length;
          setNotificationsCount(unread || 0);
        } catch {
          // ignore activities errors
        }
      } catch {
        // ignore (e.g., not logged in), keep defaults
      }
    })();
  }, [autoLoad]);

  /* ------------------------------- Utilities ------------------------------ */
  const go = (path: string) => {
    router.push(path);
    setOpen(false);
    setTransfersOpen(false);
  };

  // ROUTING DEFAULTS (used when no callback is supplied)
  const goOverview = () => go(PATHS.DASHBOARD_HOME || "/dashboard/dashboard");
  const goTransactions = () => go(PATHS.DASHBOARD_TRANSACTIONS || "/dashboard/transactions");
  const goInsights = () => go(PATHS.DASHBOARD_INSIGHTS || "/dashboard/insights");
  const goCards = () => go(PATHS.CARDS || "/dashboard/cards");
  const goGoals = () => go(PATHS.GOALS || "/dashboard/goals");
  const goRecurring = () => go(PATHS.RECURRING || "/dashboard/recurring");
  const goSettings = () => go(PATHS.SETTINGS || "/dashboard/settings");

  // ✅ HARD ROUTE Support to this dashboard page
  const goSupport = () => go("/dashboard/support");

  const goNotifications = () => go(PATHS.NOTIFICATIONS || "/notifications");

  // Transfer hub route (ALL transfer entries go here)
  const goTransferHub = () => go("/Transfer/transfermethod");
  // Non-hub quick actions
  const goAddMoney = () => go(PATHS.TRANSFER_ADD || "/Transfer/addmoney");
  const goPayBill = () => go(PATHS.TRANSFER_PAYBILL || "/Transfer/paybill");

  const callOrRoute = (cb: (() => void) | undefined, fallback: () => void) => {
    if (typeof cb === "function") return cb();
    fallback();
  };

  const noop = () => {};

  /* ---------------------------------- FX ---------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const mq = window.matchMedia("(min-width: 1024px)");
    const mqListener = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsDesktop("matches" in e ? e.matches : (e as MediaQueryList).matches);
    setIsDesktop(mq.matches);
    mq.addEventListener?.("change", mqListener);
    // Safari fallback
    // @ts-ignore
    mq.addListener?.(mqListener);

    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener?.("change", mqListener);
      // @ts-ignore
      mq.removeListener?.(mqListener);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    const isMobile = !isDesktop;
    document.body.style.overflow = open && isMobile ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open, isDesktop]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setTransfersOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  /* -------------------------- Responsive sizing --------------------------- */
  const size = (() => {
    if (isDesktop) {
      return scrolled ? { bar: 92, logo: 92 } : { bar: 122, logo: 122 };
    }
    return scrolled ? { bar: 84, logo: 74 } : { bar: 106, logo: 96 };
  })();

  const baseTop = `color-mix(in oklab, var(--page-grad-top, #0b0f14) ${
    scrolled ? "96%" : "88%"
  }, black 0%)`;
  const baseBot = `color-mix(in oklab, var(--page-grad-bot, #0b0f14) ${
    scrolled ? "86%" : "74%"
  }, black 0%)`;
  const headerBackground = `linear-gradient(180deg, ${baseTop}, ${baseBot})`;

  return (
    <>
      {/* Header */}
      <div
        className="fixed inset-x-0 top-0 z-[50] transition-[background,height,box-shadow,border-color] duration-200 backdrop-blur-[6px]"
        style={{
          paddingTop: "calc(env(safe-area-inset-top,0px) + 4px)",
          height: size.bar,
          background: headerBackground,
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.10)"
            : "1px solid rgba(255,255,255,0.06)",
          boxShadow: scrolled
            ? "0 8px 28px rgba(0,0,0,.32)"
            : "0 12px 36px rgba(0,0,0,.24)",
        }}
      >
        {/* TRUE full-width container (no max-width) */}
        <div className="w-full px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Left: brand + greeting */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={PATHS.DASHBOARD_HOME || "/dashboard/dashboard"}
              className="flex items-center gap-2 -ml-1 sm:-ml-1.5"
              aria-label="Horizon Dashboard"
            >
              <img
                src="/Hero/logo.png"
                alt="Horizon"
                className="w-auto select-none"
                draggable={false}
                style={{
                  height: size.logo,
                  transition: "height .25s ease, transform .25s ease",
                  transform: scrolled ? "scale(0.98)" : "scale(1)",
                }}
              />
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <div className="text-xs leading-tight">
                <div className="text-white/90 font-medium">
                  Good {getDayPart()}, {userName}
                </div>
                <div className="text-[11px] text-white/60">
                  {typeof setupPercent === "number" ? (
                    <span>
                      Setup {Math.max(0, Math.min(100, setupPercent))}%
                    </span>
                  ) : (
                    <span>Welcome back</span>
                  )}
                </div>
              </div>
              {typeof setupPercent === "number" && (
                <div className="relative h-8 w-8 rounded-full grid place-items-center bg-white/5 border border-white/10">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 36 36"
                    className="-rotate-90 opacity-80"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      stroke="white"
                      strokeOpacity="0.15"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      stroke="#00E0FF"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${
                        (1 -
                          Math.max(0, Math.min(100, setupPercent)) / 100) *
                        (2 * Math.PI * 14)
                      }`}
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Center: desktop nav */}
          <nav className="hidden lg:flex items-center gap-3 text-[14px]">
            <button
              className="px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
              onClick={() => callOrRoute(onOpenTransactions, goOverview)}
            >
              Overview
            </button>
            <button
              className="px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
              onClick={() => callOrRoute(onOpenTransactions, goTransactions)}
            >
              Transactions
            </button>
            <button
              className="px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
              onClick={() => callOrRoute(onOpenInsights, goInsights)}
            >
              Insights
            </button>

            {/* Transfers */}
            <div
              className="relative"
              onMouseLeave={() => setTransfersOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
                onMouseEnter={() => setTransfersOpen(true)}
                onClick={goTransferHub}
                aria-expanded={transfersOpen}
              >
                Transfers <ChevronDown size={14} className="opacity-70" />
              </button>
              {transfersOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2">
                  <div className="min-w-[280px] rounded-xl shadow-2xl backdrop-blur-md border border-white/10 bg-white/5 p-1.5">
                    {[
                      { label: "USA Transfer", icon: ArrowRightLeft },
                      { label: "Wire Transfer", icon: Landmark },
                      { label: "International", icon: Globe2 },
                      { label: "Crypto", icon: Bitcoin },
                    ].map((it) => (
                      <button
                        key={it.label}
                        className="w-full text-left flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/10"
                        onClick={goTransferHub}
                      >
                        <it.icon size={14} className="opacity-80" /> {it.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
              onClick={() => callOrRoute(onOpenCardsManager, goCards)}
            >
              Cards
            </button>
            <button
              className="px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
              onClick={() => callOrRoute(onOpenGoals, goGoals)}
            >
              Goals
            </button>
            <button
              className="px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
              onClick={() => callOrRoute(onOpenRecurring, goRecurring)}
            >
              Recurring
            </button>

            {/* ✅ Support always routes to /dashboard/support */}
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5"
              onClick={goSupport}
            >
              <HelpCircle size={15} className="opacity-80" />
              Support
            </button>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              aria-label="Search"
              className="h-10 w-10 rounded-2xl hover:bg-white/10 active:scale-[.98] transition grid place-items-center"
              onClick={() => callOrRoute(onOpenSearch, noop)}
            >
              <Search size={18} />
            </button>

            <button
              aria-label="Notifications"
              className="relative h-10 w-10 rounded-2xl hover:bg-white/10 active:scale-[.98] transition grid place-items-center"
              onClick={() =>
                callOrRoute(onOpenNotifications, goNotifications)
              }
            >
              <Bell size={18} />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-[#00E0FF] text-[#0B0F14] text-[10px] grid place-items-center font-semibold">
                  {Math.min(99, notificationsCount)}
                </span>
              )}
            </button>

            <button
              aria-label="Settings"
              className="hidden md:grid h-10 w-10 rounded-2xl hover:bg-white/10 active:scale-[.98] transition place-items-center"
              onClick={() => callOrRoute(onOpenSettings, goSettings)}
            >
              <Settings size={17} />
            </button>

            <button
              aria-label="Profile"
              className="hidden md:flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-2xl hover:bg-white/10 active:scale-[.98] transition"
              onClick={() => callOrRoute(onOpenProfile, goSettings)}
            >
              <div className="h-8 w-8 rounded-full bg-white/10 border border-white/10 grid place-items-center">
                <User2 size={15} className="opacity-80" />
              </div>
              <span className="text-xs text-white/80 max-w-[120px] truncate">
                {userName}
              </span>
            </button>

            <button
              ref={triggerRef}
              aria-label="Open menu"
              aria-expanded={open}
              className="lg:hidden h-11 w-11 flex items-center justify-center rounded-2xl hover:bg-white/10 active:scale-[.98] transition"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto"
          style={{
            background: `linear-gradient(180deg, ${baseTop}, ${baseBot})`,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full px-4 sm:px-6 pt-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row (non-sticky) */}
            <div className="mb-4 flex items-center justify-between">
              <img
                src="/Hero/logo.png"
                alt="Horizon"
                className="select-none"
                draggable={false}
                style={{ height: 96, width: "auto" }}
              />
              <button
                aria-label="Close menu"
                className="h-11 w-11 rounded-2xl hover:bg-white/10 active:scale-[.98] transition flex items-center justify-center"
                onClick={() => setOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div
              className="mx-auto rounded-3xl overflow-hidden p-4 backdrop-blur-md"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {/* Quick Actions */}
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5">
                    Quick Actions
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      className="card card-hover px-3 py-2.5 rounded-xl flex items-center gap-1.5"
                      onClick={goAddMoney}
                    >
                      <Wallet size={15} className="opacity-80" /> Add Money
                    </button>
                    <button
                      className="card card-hover px-3 py-2.5 rounded-xl flex items-center gap-1.5"
                      onClick={goTransferHub}
                    >
                      <ArrowRightLeft size={15} className="opacity-80" /> Transfer
                    </button>
                    <button
                      className="card card-hover px-3 py-2.5 rounded-xl flex items-center gap-1.5"
                      onClick={goPayBill}
                    >
                      <Plus size={15} className="opacity-80" /> Pay Bill
                    </button>
                    <button
                      className="card card-hover px-3 py-2.5 rounded-xl flex items-center gap-1.5"
                      onClick={() => callOrRoute(onOpenCardsManager, goCards)}
                    >
                      <CreditCard size={15} className="opacity-80" /> Cards
                    </button>
                  </div>
                </div>

                {/* Sections */}
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5">
                      Dashboard
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        {
                          label: "Overview",
                          onClick: () =>
                            callOrRoute(onOpenTransactions, goOverview),
                        },
                        {
                          label: "Transactions",
                          onClick: () =>
                            callOrRoute(onOpenTransactions, goTransactions),
                        },
                        {
                          label: "Insights",
                          onClick: () =>
                            callOrRoute(onOpenInsights, goInsights),
                        },
                        {
                          label: "Cards",
                          onClick: () =>
                            callOrRoute(onOpenCardsManager, goCards),
                        },
                        {
                          label: "Goals",
                          onClick: () => callOrRoute(onOpenGoals, goGoals),
                        },
                        {
                          label: "Recurring",
                          onClick: () =>
                            callOrRoute(onOpenRecurring, goRecurring),
                        },
                      ].map((l) => (
                        <button
                          key={l.label}
                          className="card card-hover px-3 py-2.5 rounded-xl text-left"
                          onClick={() => {
                            l.onClick();
                            setOpen(false);
                          }}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5">
                      Transfers
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        className="card card-hover px-3 py-2.5 rounded-xl text-left"
                        onClick={goTransferHub}
                      >
                        USA Transfer
                      </button>
                      <button
                        className="card card-hover px-3 py-2.5 rounded-xl text-left"
                        onClick={goTransferHub}
                      >
                        Wire Transfer
                      </button>
                      <button
                        className="card card-hover px-3 py-2.5 rounded-xl text-left"
                        onClick={goTransferHub}
                      >
                        International
                      </button>
                      <button
                        className="card card-hover px-3 py-2.5 rounded-xl text-left"
                        onClick={goTransferHub}
                      >
                        Crypto
                      </button>
                      <button
                        className="card card-hover px-3 py-2.5 rounded-xl text-left"
                        onClick={goAddMoney}
                      >
                        Add Money
                      </button>
                      <button
                        className="card card-hover px-3 py-2.5 rounded-xl text-left"
                        onClick={goPayBill}
                      >
                        Pay Bill
                      </button>
                    </div>
                  </div>
                </div>

                {/* Support & Settings */}
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1.5">
                    Account
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      {
                        label: "Settings",
                        icon: Settings,
                        onClick: () =>
                          callOrRoute(onOpenSettings, goSettings),
                      },
                      {
                        label: "Support",
                        icon: HelpCircle,
                        onClick: goSupport, // ✅ forced route
                      },
                    ].map((l) => (
                      <button
                        key={l.label}
                        className="card card-hover px-3 py-2.5 rounded-xl flex items-center gap-1.5"
                        onClick={() => {
                          l.onClick();
                          setOpen(false);
                        }}
                      >
                        <l.icon size={15} className="opacity-80" /> {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional: if caller wants to intercept support, still allow it */}
                {typeof onOpenSupport === "function" && (
                  <div className="mt-3 text-[11px] text-white/50">
                    Support handler detected. Navigation still routes to /dashboard/support.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------ helpers ------------------------------ */
function getDayPart() {
  try {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  } catch {
    return "day";
  }
}
