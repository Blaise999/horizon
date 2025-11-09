// app/savings/page.tsx
"use client";

import { motion } from "framer-motion";
import { PiggyBank, Target, CalendarClock, Sparkles } from "lucide-react";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#101826] ring-1 ring-white/10 p-5">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-[#9BB0C6]">{label}</div>
    </div>
  );
}

export default function SavingsGoalsPage() {
  const perks = [
    { icon: <PiggyBank />, t: "Daily Interest", d: "Compounded daily, credited monthly for smooth growth." },
    { icon: <Target />, t: "Named Goals", d: "Trips, rent, emergency—dedicated pockets with rules." },
    { icon: <CalendarClock />, t: "Auto-Save", d: "Smart round-ups and payday sweeps you can tweak." },
    { icon: <Sparkles />, t: "Boosts", d: "Limited-time APY boosts and streak rewards." },
  ];

  return (
    <main className="min-h-svh bg-[#0E131B] text-[#E6EEF7]">
      <NavBrand />

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-10">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-semibold">
          Savings & Goals
        </motion.h1>
        <p className="mt-4 max-w-2xl text-[#9BB0C6]">
          Make progress that you can feel—automated saves, streaks, and delightful milestones.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Stat label="Projected in 12 months" value="$2,830" />
          <Stat label="Round-ups last 30 days" value="$164.20" />
          <Stat label="Goal streak" value="37 days" />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {perks.map((p, i) => (
            <motion.div
              key={p.t}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-5 bg-[#101826] ring-1 ring-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/5">{p.icon}</div>
                <h3 className="font-medium">{p.t}</h3>
              </div>
              <p className="mt-2 text-sm text-[#9BB0C6]">{p.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
