// Horizon — Adaptive Nav (SSR-safe, theme-inheriting)
// Seamless on hero: transparent at top, glassy after a sensible scroll.

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, HelpCircle } from "lucide-react";
import { PATHS } from "@/config/routes";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // ✅ single source of truth for all help/support routes
  const SUPPORT_PATH = "/support";

  /* ---------------------- Safe link resolver ---------------------- */
  const KNOWN: string[] = [
    "/",
    "/personal",
    "/cards",
    "/savings",
    "/invest",
    "/security",
    "/support",
    "/about",
    "/blog",
    "/careers",
    "/international",
    "/invoicing",
    "/expense-cards",
    "/create-account",
  ];

  const to = (maybeKeyOrPath?: string): string => {
    // ✅ hard-bind support keys to /support
    if (maybeKeyOrPath === "SUPPORT") return SUPPORT_PATH;

    const p =
      (maybeKeyOrPath && (PATHS as any)[maybeKeyOrPath]) ??
      maybeKeyOrPath ??
      PATHS.CREATE_ACCOUNT ??
      "/create-account";

    if (typeof p === "string" && p.startsWith("/")) {
      return KNOWN.includes(p) ? p : (PATHS.CREATE_ACCOUNT ?? "/create-account");
    }
    return PATHS.CREATE_ACCOUNT ?? "/create-account";
  };

  /* ------------- Scroll, body-lock, route/ESC close (effects) ------------- */
  useEffect(() => {
    // Allow overriding the threshold from CSS: :root { --nav-solid-threshold: 160; }
    const readThreshold = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--nav-solid-threshold")
        ?.trim();
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 160; // default 160px
    };

    let THRESHOLD = 160;
    const setByScroll = () => setScrolled(window.scrollY > THRESHOLD);

    const onScroll = () => setByScroll();
    const onResize = () => {
      THRESHOLD = readThreshold();
      setByScroll();
    };

    THRESHOLD = readThreshold();
    setByScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    document.body.style.overflow = open && isMobile ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ----------------------------- Derived UI ------------------------------ */
  const barHeight = scrolled ? 64 : 84;
  const logoHeight = scrolled ? 110 : 150;

  // Tokens from CSS vars (SSR-safe)
  const CSS = {
    top: "var(--page-grad-top, #0b0f14)",
    bot: "var(--page-grad-bot, #0b0f14)",
    text: "var(--c-text, #E6EEF7)",
    text2: "var(--c-text-2, #9BB0C6)",
    hair: "var(--c-hairline, #FFFFFF1A)",
    cta: "var(--c-cta, linear-gradient(90deg,#00B4D8,#00E0FF))",
    rBtn: "var(--r-btn, 14px)",
    rChip: "var(--r-chip, 12px)",
    backdrop: "var(--header-backdrop, none)",
    shadowRest: "var(--header-shadow-rest, 0 10px 28px rgba(0,0,0,.22))",
    shadowScrolled: "var(--header-shadow-scrolled, 0 6px 24px rgba(0,0,0,.30))",
  } as const;

  // Scrolled state uses the page's surface so it still matches
  const baseTop = `color-mix(in oklab, ${CSS.top} 94%, black 0%)`;
  const baseBot = `color-mix(in oklab, ${CSS.bot} 84%, black 0%)`;

  const headerStyle: React.CSSProperties = scrolled
    ? {
        background: `linear-gradient(180deg, ${baseTop}, ${baseBot})`,
        WebkitBackdropFilter: CSS.backdrop as any,
        backdropFilter: CSS.backdrop as any,
        borderBottom: `1px solid rgba(255,255,255,0.12)`,
        boxShadow: CSS.shadowScrolled,
        color: CSS.text,
      }
    : {
        // **Seamless**: fully transparent on top of hero (no seam/border/shadow)
        background: "transparent",
        WebkitBackdropFilter: "none" as any,
        backdropFilter: "none" as any,
        borderBottom: "1px solid transparent",
        boxShadow: "none",
        color: CSS.text,
      };

  return (
    <>
      {/* Header */}
      <div
        className="fixed inset-x-0 top-0 z-[50] nav-header transition-[background,height,box-shadow,border-color,backdrop-filter] duration-200"
        style={{
          paddingTop: "calc(env(safe-area-inset-top,0px) + 4px)",
          height: barHeight,
          ...headerStyle,
        }}
        data-seamless={!scrolled}
      >
        <div className="container-x flex items-center justify-between h-full">
          {/* Left: Logo */}
          <Link
            href={to("HOME")}
            className="flex items-center gap-3 -ml-1 sm:-ml-2"
            aria-label="Horizon Home"
          >
            <img
              src="/Hero/logo.png"
              alt="Horizon"
              className="w-auto select-none"
              draggable={false}
              style={{
                height: logoHeight,
                transition:
                  "height .25s ease, transform .25s ease, filter .2s ease",
                transform: scrolled ? "scale(0.98)" : "scale(1)",
                filter: scrolled ? "saturate(1.02)" : "saturate(1)",
              }}
            />
          </Link>

          {/* Center: Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-2 text-sm"
            style={{ color: CSS.text }}
          >
            {/* Features → all to Create Account */}
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-4 py-2 rounded-md hover:bg-white/5"
                style={{ color: CSS.text2 }}
              >
                Features <ChevronDown size={16} className="opacity-70" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition absolute left-1/2 -translate-x-1/2 top-full pt-2">
                <div
                  className="card p-5 min-w-[620px] grid grid-cols-2 gap-4 rounded-xl shadow-2xl"
                  style={{ border: `1px solid ${CSS.hair}` }}
                >
                  {[
                    {
                      title: "Current Account / Debit Card",
                      desc: "Spend anywhere with instant notifications",
                    },
                    {
                      title: "Savings & Goals",
                      desc: "Auto-roundups and high-yield vaults",
                    },
                    {
                      title: "International Transfers",
                      desc: "Low FX fees and fast remittance",
                    },
                    {
                      title: "Virtual Cards & Analytics",
                      desc: "One-tap controls and clean insights",
                    },
                    {
                      title: "Investments",
                      desc: "Stocks & ETFs with clear fees",
                    },
                    {
                      title: "Crypto (optional)",
                      desc: "Simple on/off-ramps, secure custody",
                    },
                  ].map((item) => (
                    <Link
                      key={item.title}
                      href={to("CREATE_ACCOUNT")}
                      className="rounded-lg p-3 hover:bg-white/5"
                    >
                      <div
                        className="text-[13px] font-medium"
                        style={{ color: CSS.text }}
                      >
                        {item.title}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: CSS.text2 }}
                      >
                        {item.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* For You */}
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-4 py-2 rounded-md hover:bg-white/5"
                style={{ color: CSS.text2 }}
              >
                For You <ChevronDown size={16} className="opacity-70" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition absolute left-0 top-full pt-2">
                <div
                  className="card p-3 min-w-[240px] rounded-xl shadow-2xl"
                  style={{ border: `1px solid ${CSS.hair}` }}
                >
                  {[
                    { label: "Personal Banking", href: "/personal" },
                    { label: "Cards & Controls", href: "/cards" },
                    { label: "Savings & Goals", href: "/savings" },
                    { label: "Invest & Grow", href: "/invest" },
                  ].map((l) => (
                    <Link
                      key={l.label}
                      href={to(l.href)}
                      className="block px-3 py-2 rounded-md hover:bg-white/5"
                      style={{ color: CSS.text }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* For Business */}
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-4 py-2 rounded-md hover:bg-white/5"
                style={{ color: CSS.text2 }}
              >
                For Business <ChevronDown size={16} className="opacity-70" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition absolute left-0 top-full pt-2">
                <div
                  className="card p-3 min-w-[260px] rounded-xl shadow-2xl"
                  style={{ border: `1px solid ${CSS.hair}` }}
                >
                  {[
                    { label: "Transfer Logic", href: "/invoicing" },
                    { label: "Expense Cards", href: "/expense-cards" },
                    { label: "Business Accounts", href: to("CREATE_ACCOUNT") },
                  ].map((l) => (
                    <Link
                      key={l.label}
                      href={to(l.href)}
                      className="block px-3 py-2 rounded-md hover:bg-white/5"
                      style={{ color: CSS.text }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Company */}
            <div className="relative group">
              <button
                className="flex items-center gap-1 px-4 py-2 rounded-md hover:bg-white/5"
                style={{ color: CSS.text2 }}
              >
                Company <ChevronDown size={16} className="opacity-70" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition absolute left-0 top-full pt-2">
                <div
                  className="card p-3 min-w-[240px] rounded-xl shadow-2xl"
                  style={{ border: `1px solid ${CSS.hair}` }}
                >
                  {[
                    { label: "About Us", href: "/about" },
                    { label: "Careers", href: "/careers" },
                    { label: "Blog / Press", href: "/blog" },
                    { label: "Security", href: "/security" },
                  ].map((l) => (
                    <Link
                      key={l.label}
                      href={to(l.href)}
                      className="block px-3 py-2 rounded-md hover:bg-white/5"
                      style={{ color: CSS.text }}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* ✅ Help always to /support */}
            <Link
              href={SUPPORT_PATH}
              className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-white/5"
              style={{ color: CSS.text }}
            >
              <HelpCircle size={16} className="opacity-80" />
              Help
            </Link>
          </nav>

          {/* Right: CTA + hamburger */}
          <div className="flex items-center gap-2">
            <Link
              href={to("CREATE_ACCOUNT")}
              className="px-5 py-2.5 font-medium"
              style={{
                borderRadius: CSS.rBtn,
                background: scrolled ? "rgba(255,255,255,.9)" : CSS.cta,
                color: "#0B0F14",
                boxShadow: scrolled
                  ? "inset 0 1px 0 rgba(255,255,255,.25)"
                  : "0 10px 28px rgba(0,180,216,.35)",
              }}
            >
              Open account
            </Link>

            <button
              ref={triggerRef}
              aria-label="Open menu"
              aria-expanded={open}
              className="md:hidden h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-white/10 active:scale-[.98] transition"
              onClick={() => setOpen(true)}
              style={{ color: CSS.text }}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {open && (
        <div
          className="fixed inset-0 z-[60]"
          style={{
            background: `linear-gradient(180deg, color-mix(in oklab, ${CSS.top} 92%, black 0%), color-mix(in oklab, ${CSS.bot} 78%, black 0%))`,
            WebkitBackdropFilter: CSS.backdrop as any,
            backdropFilter: CSS.backdrop as any,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="container-x pt-4 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto rounded-3xl mt-4 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                border: `1px solid ${CSS.hair}`,
                paddingBottom:
                  "calc(env(safe-area-inset-bottom,0px) + 20px)",
                color: CSS.text,
              }}
            >
              <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 pt-1 bg-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 -ml-1">
                    <img
                      src="/Hero/logo.png"
                      alt="Horizon"
                      className="select-none"
                      draggable={false}
                      style={{ height: 56, width: "auto" }}
                    />
                  </div>
                  <button
                    aria-label="Close menu"
                    className="h-11 w-11 rounded-2xl hover:bg-white/10 active:scale-[.98] transition flex items-center justify-center"
                    onClick={() => setOpen(false)}
                    style={{ color: CSS.text }}
                  >
                    <X />
                  </button>
                </div>
              </div>

              {/* Language chips */}
              <div className="flex gap-2 text-sm mb-5">
                {["🇺🇸 EN", "🇬🇧 EN", "🇪🇺 EU"].map((c, i) => (
                  <button
                    key={i}
                    className="px-3 py-1.5 border"
                    style={{
                      borderRadius: CSS.rChip,
                      background: "rgba(255,255,255,.06)",
                      borderColor: CSS.hair,
                      color: CSS.text,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Sections */}
              <div className="space-y-6">
                {/* Features → Create Account */}
                <div>
                  <div
                    className="text-[11px] uppercase tracking-wider mb-2"
                    style={{ color: CSS.text2 }}
                  >
                    Features / Products
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      "Current Account / Debit Card",
                      "Savings & Goals",
                      "International Transfers",
                      "Virtual Cards & Analytics",
                      "Investments",
                      "Crypto (optional)",
                    ].map((label) => (
                      <Link
                        key={label}
                        href={to("CREATE_ACCOUNT")}
                        className="card card-hover px-4 py-3 rounded-xl"
                        onClick={() => setOpen(false)}
                        style={{
                          border: `1px solid ${CSS.hair}`,
                          background: "rgba(255,255,255,.04)",
                          color: CSS.text,
                        }}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* For You */}
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <div
                      className="text-[11px] uppercase tracking-wider mb-2"
                      style={{ color: CSS.text2 }}
                    >
                      For You
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: "Personal Banking", href: "/personal" },
                        { label: "Cards & Controls", href: "/cards" },
                        { label: "Savings & Goals", href: "/savings" },
                        { label: "Invest & Grow", href: "/invest" },
                      ].map((l) => (
                        <Link
                          key={l.label}
                          href={to(l.href)}
                          className="card card-hover px-4 py-3 rounded-xl"
                          onClick={() => setOpen(false)}
                          style={{
                            border: `1px solid ${CSS.hair}`,
                            background: "rgba(255,255,255,.04)",
                            color: CSS.text,
                          }}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* For Business */}
                  <div>
                    <div
                      className="text-[11px] uppercase tracking-wider mb-2"
                      style={{ color: CSS.text2 }}
                    >
                      For Business
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: "Transfer Logic", href: "/invoicing" },
                        { label: "Expense Cards", href: "/expense-cards" },
                        { label: "Business Accounts", href: to("CREATE_ACCOUNT") },
                      ].map((l) => (
                        <Link
                          key={l.label}
                          href={to(l.href)}
                          className="card card-hover px-4 py-3 rounded-xl"
                          onClick={() => setOpen(false)}
                          style={{
                            border: `1px solid ${CSS.hair}`,
                            background: "rgba(255,255,255,.04)",
                            color: CSS.text,
                          }}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Company */}
                <div>
                  <div
                    className="text-[11px] uppercase tracking-wider mb-2"
                    style={{ color: CSS.text2 }}
                  >
                    Company
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { label: "About Us", href: "/about" },
                      { label: "Careers", href: "/careers" },
                      { label: "Blog / Press", href: "/blog" },
                      { label: "Security", href: "/security" },
                    ].map((l) => (
                      <Link
                        key={l.label}
                        href={to(l.href)}
                        className="card card-hover px-4 py-3 rounded-xl"
                        onClick={() => setOpen(false)}
                        style={{
                          border: `1px solid ${CSS.hair}`,
                          background: "rgba(255,255,255,.04)",
                          color: CSS.text,
                        }}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* ✅ Help & Support → always /support */}
                <div>
                  <div
                    className="text-[11px] uppercase tracking-wider mb-2"
                    style={{ color: CSS.text2 }}
                  >
                    Help & Support
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { label: "Help Center", href: SUPPORT_PATH },
                      { label: "Live Chat", href: SUPPORT_PATH },
                      { label: "Contact", href: SUPPORT_PATH },
                    ].map((l) => (
                      <Link
                        key={l.label}
                        href={l.href}
                        className="card card-hover px-4 py-3 rounded-xl"
                        onClick={() => setOpen(false)}
                        style={{
                          border: `1px solid ${CSS.hair}`,
                          background: "rgba(255,255,255,.04)",
                          color: CSS.text,
                        }}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={to("CREATE_ACCOUNT")}
                  className="mt-2 px-5 py-3 font-medium text-center block"
                  onClick={() => setOpen(false)}
                  style={{
                    borderRadius: CSS.rBtn,
                    background: CSS.cta,
                    color: "#0B0F14",
                  }}
                >
                  Open account
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
