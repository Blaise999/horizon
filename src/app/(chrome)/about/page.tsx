// app/about/page.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Globe2,
  Users2,
  Target,
  Sparkles,
  Rocket,
  HeartHandshake,
  Zap,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";

/* ───────────────────────────────────────────────
   🔹 Page: About Horizon — full cinematic variant
   (US-first, professional copy)
──────────────────────────────────────────────── */
export default function AboutPage() {
  const { scrollYProgress } = useScroll();
  const yHero = useTransform(scrollYProgress, [0, 0.3], [0, -200]);

  return (
    <main className="min-h-svh bg-[#0E131B] text-[#E6EEF7] overflow-hidden">
      <NavBrand />

      {/* HERO SECTION */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: yHero }} className="absolute inset-0 -z-10">
          <Image
            src="/Hero/hero-team.jpg"
            alt="Team background"
            fill
            priority
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E131B]/60 via-[#0E131B]/80 to-[#0E131B]" />
        </motion.div>

        <div className="max-w-3xl text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-semibold leading-tight"
          >
            We’re building the <span className="text-[#00E0FF]">future</span> of finance.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-[#9BB0C6] text-lg"
          >
            Horizon is a U.S. digital bank built to make money movement invisible, intuitive, and inspiring—without compromises on trust or control.
          </motion.p>
        </div>
      </section>

      {/* MISSION STRIP */}
      <section className="py-20 bg-gradient-to-b from-[#0E131B] to-[#101826] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(0,228,255,0.2)_0%,transparent_70%)]" />
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-semibold"
          >
            A mission beyond money
          </motion.h2>
          <p className="mt-4 text-[#9BB0C6] max-w-2xl mx-auto">
            We’re not just shipping features—we’re designing calm, confident banking for modern life and business.
          </p>

          {/* 3 mission highlights */}
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            {[
              [<Rocket key="r" />, "Speed", "Instant actions that feel magical—from transfers to top-ups."],
              [<HeartHandshake key="h" />, "Trust", "Every transaction and policy designed with integrity."],
              [<Sparkles key="s" />, "Clarity", "Finance that reduces friction and highlights what matters."],
            ].map(([icon, title, desc]) => (
              <motion.div
                key={title as string}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-[#101826] ring-1 ring-white/10 p-6"
              >
                <div className="p-3 rounded-xl bg-white/5 inline-block mb-3">{icon}</div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-[#9BB0C6] mt-1">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-5xl font-semibold text-center mb-12"
        >
          The Horizon story
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="space-y-5"
          >
            <p className="text-[#9BB0C6] text-lg leading-relaxed">
              Horizon started with a simple question: what if a bank felt as considered as a world-class product studio? Where design discipline, modern infrastructure, and human support converge.
            </p>
            <p className="text-[#9BB0C6] text-lg leading-relaxed">
              We launched in the United States and grew with customers who value reliability, transparent pricing, and beautiful execution. From day one, we invested in security, performance, and clear controls.
            </p>
            <p className="text-[#9BB0C6] text-lg leading-relaxed">
              Today, we serve a nationwide audience and selected global users, while continuing to build with the pace and precision of a small, focused team.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="relative h-[420px] rounded-3xl overflow-hidden ring-1 ring-white/10"
          >
            <Image src="/Hero/founders.jpg" alt="Founders" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E131B]/70 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* VALUES STRIP */}
      <section className="bg-[#0F1622] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-semibold mb-12 text-center"
          >
            Our Values
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              [<Globe2 key="g" />, "Open by Design", "Interoperable systems and clear APIs—no dark corners."],
              [<Users2 key="u" />, "Human First", "Accessibility, inclusion, and real support when it matters."],
              [<Target key="t" />, "Precision", "Every pixel and policy crafted for clarity and control."],
            ].map(([icon, title, desc]) => (
              <motion.div
                key={title as string}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-[#101826] ring-1 ring-white/10 p-6"
              >
                <div className="p-2 rounded-xl bg-white/5 inline-block mb-3">{icon}</div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-[#9BB0C6] mt-1">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-5xl font-semibold text-center mb-12"
        >
          Our impact in numbers
        </motion.h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ["1.8M+", "U.S. customers"],
            ["95+", "Supported countries for cards & transfers"],
            ["99.98%", "Core uptime"],
            ["$6.2B+", "Annualized payment volume"],
          ].map(([n, l]) => (
            <motion.div
              key={l}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-[#101826] ring-1 ring-white/10 p-8"
            >
              <div className="text-4xl font-semibold text-white">{n}</div>
              <div className="mt-2 text-sm text-[#9BB0C6]">{l}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* INNOVATION STRIP */}
      <section className="relative py-24 bg-gradient-to-b from-[#101826] to-[#0E131B] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,228,255,0.08)_0%,transparent_70%)]" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-semibold">Innovation never sleeps</h2>
              <p className="text-[#9BB0C6] text-lg">
                We ship continuously, measure ruthlessly, and refine what works. From motion micro-interactions to AI-assisted insights, Horizon evolves with your habits.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  [<Zap key="z" />, "Instant Launches"],
                  [<ShieldCheck key="s" />, "Secure Core"],
                  [<BarChart3 key="b" />, "Insight Engine"],
                  [<Sparkles key="sp" />, "AI Refinement"],
                ].map(([ic, tx]) => (
                  <div key={tx as string} className="flex items-center gap-2 text-sm text-[#9BB0C6]">
                    <div className="p-2 rounded-md bg-white/5">{ic}</div>
                    {tx}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative h-[420px] rounded-3xl overflow-hidden ring-1 ring-white/10"
            >
              <Image src="/Hero/lab.jpg" alt="Innovation lab" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E131B]/80 to-transparent" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-24 text-center bg-[#0E131B]">
        <h2 className="text-4xl md:text-6xl font-semibold">The journey is just beginning.</h2>
        <p className="mt-4 text-[#9BB0C6] max-w-xl mx-auto">
          Join customers who expect clarity, performance, and control—without the noise.
        </p>
        <Link
          href="/create-account"
          className="mt-8 inline-block rounded-2xl bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] px-8 py-3 text-[#0E131B] font-medium hover:scale-105 transition-transform"
        >
          Join Horizon
        </Link>
      </section>

      <AppFooter />
    </main>
  );
}
