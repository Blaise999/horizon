"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

/* --------------------------------------------------------------------------
   After‑Signup • Welcome Screen (Frontend‑first)
   - Route: /welcome
   - Purpose: Greet user, kick off onboarding, or allow skipping (keeps checklist open)
   - No backend calls; persists lightweight state to localStorage for guards later
   - No demo wording
---------------------------------------------------------------------------- */

type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
const LS_STATUS_KEY = "hb_onboarding_status";
const LS_SETUP_KEY = "hb_setup_percent";

export default function WelcomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatus>("NOT_STARTED");
  const [loading, setLoading] = useState(true);

  // You can replace this with your real user store/context later
  const userName = useMemo(() => {
    if (typeof window === "undefined") return "there";
    return localStorage.getItem("hb_user_name") || "there";
  }, []);

  useEffect(() => {
    const s = (typeof window !== "undefined" && (localStorage.getItem(LS_STATUS_KEY) as OnboardingStatus)) || "NOT_STARTED";
    setStatus(s || "NOT_STARTED");
    setLoading(false);
  }, []);

  useEffect(() => {
    // If onboarding already completed, do not show welcome again
    if (!loading && status === "COMPLETE") {
      router.replace("/dashboard?first=true");
    }
  }, [loading, status, router]);

  const startSetup = () => {
    localStorage.setItem(LS_STATUS_KEY, "IN_PROGRESS");
    // Initialize a base setup percent to visualize progress elsewhere
    localStorage.setItem(LS_SETUP_KEY, "10");
    router.push("/onboarding");
  };

  const skipForNow = () => {
    // Keep it in progress so the checklist remains visible on dashboard
    localStorage.setItem(LS_STATUS_KEY, "IN_PROGRESS");
    const current = Number(localStorage.getItem(LS_SETUP_KEY) || "0");
    if (current < 10) localStorage.setItem(LS_SETUP_KEY, "10");
    router.push("/dashboard/dashboard");
  };

  if (loading || status === "COMPLETE") {
    return (
      <div className="min-h-svh grid place-items-center bg-[radial-gradient(1200px_600px_at_20%_-10%,#0F1622_0%,#0B0F14_60%)]">
        <div className="animate-pulse text-white/60 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <main
      className="min-h-svh relative overflow-hidden bg-[#0B0F14]"
      style={{
        backgroundImage:
          "radial-gradient(900px 500px at 10% -10%, rgba(0,224,255,0.12), transparent 60%), radial-gradient(700px 400px at 90% 110%, rgba(0,180,216,0.10), transparent 60%)",
      }}
    >
      {/* Subtle backdrop sparkles */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="g" r="1">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          {[...Array(18)].map((_, i) => (
            <circle key={i} cx={Math.random() * 100 + "%"} cy={Math.random() * 100 + "%"} r={Math.random() * 2 + 0.6} fill="url(#g)" />
          ))}
        </svg>
      </div>

      <section className="container-x pt-[18vh] pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <Sparkles size={14} className="opacity-80" />
            <span>Let’s get you set up</span>
          </div>

          <h1 className="mt-5 text-4xl/tight sm:text-5xl/tight font-semibold text-white">
            Good {getDayPart()}, {userName} 👋
          </h1>
          <p className="mt-3 text-white/70 max-w-[60ch]">
            We’ll secure your account, personalize basics, and provision your starter tools. You can finish now or come back later — your progress is saved.
          </p>

          {/* Checklist preview chips */}
          <div className="mt-6 flex flex-wrap gap-2 text-[13px]">
            {[
              { label: "Create App PIN", done: false },
              { label: "Enable biometrics", done: false },
              { label: "Profile basics", done: false },
              { label: "Preferences", done: false },
              { label: "Starter kit", done: false },
            ].map((c) => (
              <span
                key={c.label}
                className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80"
              >
                {c.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={startSetup}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium text-[#0B0F14]"
              style={{
                backgroundImage: "linear-gradient(90deg,#00B4D8,#00E0FF)",
                boxShadow: "0 10px 28px rgba(0,180,216,.35)",
              }}
            >
              Start setup <ArrowRight size={16} />
            </button>

            <button
              onClick={skipForNow}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium text-white/90 border border-white/12 hover:bg-white/5"
            >
              Skip for now
            </button>
          </div>

          {/* Security reassurance */}
          <div className="mt-6 flex items-center gap-2 text-white/60 text-sm">
            <ShieldCheck size={16} />
            <span>We’ll ask for a quick confirmation for sensitive actions.</span>
          </div>
        </div>
      </section>

      {/* Footer hint */}
      <footer className="container-x pb-10 text-xs text-white/40">
        <div className="border-t border-white/10 pt-6 max-w-3xl">
          You can complete setup any time from your profile menu. Your settings and preferences carry across devices.
        </div>
      </footer>
    </main>
  );
}

/* -------------------------------- helpers ------------------------------- */
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
