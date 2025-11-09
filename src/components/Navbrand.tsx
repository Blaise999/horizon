// src/components/NavBrand.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { PATHS } from "@/config/routes";

export default function NavBrand() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // shrink on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll when mobile drawer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (open && isMobile) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  // Bigger logo + taller bar
  const barHeight = scrolled ? 78 : 92;
  const logoHeight = scrolled ? 76 : 96;

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-[50] transition-[backdrop-filter,background,height] duration-200
        ${scrolled ? "backdrop-blur-md bg-black/65 ring-1 ring-white/10" : "bg-transparent"}`}
        style={{ paddingTop: "calc(env(safe-area-inset-top,0px) + 6px)" }}
      >
        <div
          className="container-x flex items-center justify-between"
          style={{
            height: barHeight,
            borderBottom: scrolled ? "1px solid var(--c-hairline)" : "none",
          }}
        >
          {/* Left: Big Logo (desktop + mobile) */}
          <Link
            href={PATHS.HOME}
            className="flex items-center gap-3 -ml-1 sm:-ml-2"
            aria-label="Horizon Home"
          >
            <img
              src="/hero/logo.png"
              alt="Horizon"
              className="select-none"
              draggable={false}
              style={{
                height: logoHeight,
                width: "auto",
                maxHeight: "110px",
                transition:
                  "height .3s ease, filter .3s ease, transform .3s ease",
                filter: "drop-shadow(0 0 20px rgba(0,212,255,0.55))",
                transform: scrolled ? "scale(0.95)" : "scale(1.03)",
              }}
            />
          </Link>

          {/* Right: Mobile hamburger only */}
          <button
            ref={triggerRef}
            aria-label="Open menu"
            aria-expanded={open}
            className="md:hidden h-14 w-14 flex items-center justify-center rounded-2xl hover:bg-white/10 active:scale-[.98] transition"
            onClick={() => setOpen(true)}
          >
            <Menu size={30} />
          </button>

          {/* Desktop blank space (no items) */}
          <div className="hidden md:block" />
        </div>
      </div>

      {/* Mobile overlay drawer */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xl"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="container-x pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto rounded-3xl p-6 mt-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                border: "1px solid var(--c-hairline)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 -ml-1">
                  <img
                    src="/hero/logo.png"
                    alt="Horizon"
                    className="select-none"
                    draggable={false}
                    style={{
                      height: 70,
                      width: "auto",
                      filter:
                        "drop-shadow(0 0 14px rgba(0,212,255,0.55))",
                    }}
                  />
                </div>
                <button
                  aria-label="Close menu"
                  className="h-12 w-12 rounded-2xl hover:bg-white/10 active:scale-[.98] transition flex items-center justify-center"
                  onClick={() => setOpen(false)}
                >
                  <X size={28} />
                </button>
              </div>

              {/* minimal actions */}
              <div className="mt-5 grid grid-cols-1 gap-3">
                <Link
                  href={PATHS.CREATE_ACCOUNT}
                  className="px-5 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-center font-medium"
                  onClick={() => setOpen(false)}
                >
                  Open account
                </Link>
                <Link
                  href={PATHS.SIGN_IN}
                  className="px-5 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-center font-medium"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
