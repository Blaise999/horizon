"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const PLANS = [
  { name: "Free", m: 0, y: 0, features: ["Instant transfers", "Virtual card", "Basic insights"] },
  { name: "Pro", m: 8, y: 80, features: ["Everything in Free", "Advanced insights", "Priority support"] },
  { name: "Business", m: 29, y: 300, features: ["Multi-user", "Bulk payouts", "Dedicated manager"] },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  // Persist in URL + localStorage
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("annual");
    if (q === "1") setAnnual(true);
    const saved = localStorage.getItem("pricing_annual");
    if (saved) setAnnual(saved === "1");
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("annual", annual ? "1" : "0");
    history.replaceState(null, "", url.toString());
    localStorage.setItem("pricing_annual", annual ? "1" : "0");
  }, [annual]);

  return (
    <section id="pricing" className="container-x section-pad">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[28px] md:text-[36px] font-semibold">Simple, transparent pricing</h2>
          <p className="text-[var(--c-text-2)] mt-1">No hidden fees. Ever.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span>Monthly</span>
          <input type="checkbox" checked={annual} onChange={(e)=>setAnnual(e.target.checked)} />
          <span>Annual</span>
        </label>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p, idx) => {
          const price = annual ? p.y : p.m;
          const highlight = p.name === "Pro";
          return (
            <div key={p.name}
              className={`card p-6 md:p-8 ${highlight ? "ring-1 ring-[var(--c-cyan)] relative" : ""}`}
              style={highlight ? { animation: "pulse 8s ease-in-out infinite" } : {}}
            >
              <style jsx>{`
                @keyframes pulse {
                  0%, 100% { box-shadow: var(--sh-elev2); }
                  50% { box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 0 0 8px rgba(0,212,255,.08); }
                }
              `}</style>

              <div className="flex items-end justify-between">
                <div className="text-xl font-semibold">{p.name}</div>
                <div className="text-2xl font-semibold num">{price === 0 ? "$0" : `$${price}${annual ? "/yr" : "/mo"}`}</div>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-[var(--c-text-2)]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check size={16}/> {f}</li>
                ))}
              </ul>

              <a href="#cta" className="mt-5 block text-center px-4 py-2 rounded-[var(--r-btn)] text-black font-medium"
                 style={{ backgroundColor: "var(--c-cta)" }}>
                Get Started
              </a>

              <p className="mt-3 text-xs text-[var(--c-text-muted)]">
                Fine print: FX and cross-border fees may apply. See <a className="underline" href="#docs">docs</a>.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
