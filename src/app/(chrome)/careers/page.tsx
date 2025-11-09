// app/careers/page.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import {
  Landmark,
  CreditCard,
  ShieldCheck,
  Scale,
  BadgeDollarSign,
  PiggyBank,
  BarChart3,
  Headset,
  Handshake,
  Megaphone,
  MapPin,
  Users2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";

/**
 * Horizon Bank — Careers (US-first, banking-org focus, NO IMAGES)
 */

export default function CareersPage() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);

  /** EVP highlights — why work at a modern bank */
  const evp = [
    ["Service at the core", "We’re measured by outcomes customers feel: clarity, speed, and trust."],
    ["Regulatory rigor", "Bank-grade controls, transparent policies, and accountable leadership."],
    ["Ownership & growth", "Clear leveling, ongoing training, and mobility across functions."],
  ] as const;

  /** Major banking orgs & representative roles */
  const orgs = [
    {
      icon: <ShieldCheck />,
      title: "Risk & Compliance (BSA/AML)",
      blurb:
        "Safeguard the institution and our customers with strong first- and second-line practices.",
      roles: [
        ["BSA/AML Investigator", "KYC/CDD, EDD, SAR drafting, 314(a)/(b)"],
        ["Compliance Testing Analyst", "Control design & effectiveness reviews"],
        ["Sanctions Specialist", "OFAC screening, list mgmt, escalation"],
      ],
      accent: "from-cyan-500/20 to-transparent",
    },
    {
      icon: <CreditCard />,
      title: "Payments & Card Operations",
      blurb:
        "Keep money moving. Manage networks, disputes, chargebacks, settlement, and scheme compliance.",
      roles: [
        ["Card Operations Associate", "Visa/Mastercard ops, disputes"],
        ["Payments Operations Analyst", "ACH/wires returns, exceptions"],
        ["Network Programs Manager", "Rules, audits, certification"],
      ],
      accent: "from-violet-500/20 to-transparent",
    },
    {
      icon: <Scale />,
      title: "Fraud Strategy & Prevention",
      blurb:
        "Protect customers in real time. Design controls, tune rules, and lead complex investigations.",
      roles: [
        ["Fraud Strategy Manager", "Rules, velocity, behavioral signals"],
        ["Fraud Ops Specialist", "Case handling, recovery, restitution"],
        ["Loss Analytics Lead", "Trend modeling, counter-measure ROI"],
      ],
      accent: "from-rose-500/20 to-transparent",
    },
    {
      icon: <BadgeDollarSign />,
      title: "Credit & Underwriting",
      blurb:
        "Enable responsible access to credit with policy, underwriting standards, and portfolio health.",
      roles: [
        ["Consumer Underwriter", "Policy, adjudication, exceptions"],
        ["Credit Policy Analyst", "Cut-offs, limits, stress testing"],
        ["Portfolio Risk Associate", "Vintage tracking, roll rates"],
      ],
      accent: "from-emerald-500/20 to-transparent",
    },
    {
      icon: <PiggyBank />,
      title: "Treasury & Liquidity",
      blurb:
        "Protect liquidity and optimize funding. Daily cash mgmt, ALM, and investment policy execution.",
      roles: [
        ["Treasury Analyst", "Cash positioning, reconciliations"],
        ["ALM Associate", "Gap analysis, interest-rate risk"],
        ["Investments Ops", "Policy, safekeeping, counterparties"],
      ],
      accent: "from-amber-500/20 to-transparent",
    },
    {
      icon: <BarChart3 />,
      title: "Finance & FP&A",
      blurb:
        "Plan and report with precision. Own forecasts, product P&Ls, and board-ready narrative.",
      roles: [
        ["Senior FP&A Analyst", "Forecasts, variance, unit economics"],
        ["Controller (Assistant)", "Close, policies, SOX readiness"],
        ["Reporting Lead", "Reg & mgmt reporting, KPI cadence"],
      ],
      accent: "from-sky-500/20 to-transparent",
    },
    {
      icon: <Headset />,
      title: "Customer Success",
      blurb:
        "Human support that earns loyalty. Omnichannel care, complex case resolution, SLAs that matter.",
      roles: [
        ["Customer Care Advocate", "Chat/voice, empathy, accuracy"],
        ["Case Resolution Lead", "Escalations, root cause, playbooks"],
        ["Quality & Training", "Rubrics, calibration, coaching"],
      ],
      accent: "from-indigo-500/20 to-transparent",
    },
    {
      icon: <Handshake />,
      title: "Partnerships & Business Development",
      blurb:
        "Grow responsibly. Build network, merchant, and ecosystem relationships that improve the product.",
      roles: [
        ["Issuer/Network Partner Lead", "Scheme alignment, incentives"],
        ["Merchant Partnerships", "Acceptance, QR/NFC programs"],
        ["Channel Partnerships", "Payroll, bill-pay, benefits"],
      ],
      accent: "from-fuchsia-500/20 to-transparent",
    },
    {
      icon: <Megaphone />,
      title: "Brand, Education & Community",
      blurb:
        "Drive financial confidence. Build programs for literacy, onboarding, and transparent comms.",
      roles: [
        ["Content & Education Lead", "Guides, in-app tours, webinars"],
        ["Lifecycle/CRM Manager", "Segmentation, nudges, surveys"],
        ["Community Programs", "Ambassadors, events, feedback"],
      ],
      accent: "from-teal-500/20 to-transparent",
    },
  ];

  /** Benefits (bank-appropriate, US-centric) */
  const benefits = [
    ["Health & Wellness", "Medical, dental, vision; mental-health support; HSA/FSA options."],
    ["Comp & Ownership", "Competitive base, annual bonus eligibility, and meaningful equity."],
    ["Retirement", "401(k) with match; financial-planning resources."],
    ["Time Off", "20+ PTO days, company holidays, and recharge days."],
    ["Family", "Paid parental leave and ramp-back flexibility."],
    ["Tools", "Modern hardware and stipend for home office."],
    ["Learning", "Annual education budget and certification support."],
    ["Giving", "Charitable donation matching and volunteer days."],
  ] as const;

  /** Hiring process adapted to financial roles */
  const process = [
    ["Apply", "Share a concise resume and any relevant certifications (e.g., CAMS, CRCM, CFE)."],
    ["Recruiter Intro", "30-min conversation on background, interests, timeline, and comp bands."],
    ["Panel: Role Deep-Dive", "Discuss domain scenarios with future teammates and manager."],
    ["Practical Exercise", "Paid take-home or structured case (e.g., SAR outline, ACH exception flow)."],
    ["Executive Conversation", "Team fit, values, and long-term path."],
    ["Offer", "Transparent leveling, compensation, and start-plan alignment."],
  ] as const;

  /** FAQs tuned for a bank */
  const faqs = [
    [
      "Do I need prior bank experience?",
      "Helpful, but not required for every role. We value domain rigor, sound judgment, and learning speed.",
    ],
    [
      "Where do you hire?",
      "We’re remote-friendly across U.S. time zones, with hubs in New York, San Francisco, Austin, Chicago, and Miami.",
    ],
    [
      "What credentials are useful?",
      "Depending on role: CAMS, CRCM, CFE, ACAMS, CPA, CFA, or NACHA/APRP. We also sponsor selective certifications.",
    ],
    ["How fast is your process?", "Typically 2–4 weeks end-to-end, with clear comms at each step."],
  ] as const;

  return (
    <main className="min-h-svh bg-[#0E131B] text-[#E6EEF7] overflow-hidden">
      <NavBrand />

      {/* HERO — service-forward banking tone, no images */}
      <section className="relative h-[72vh] flex items-center justify-center overflow-hidden">
        <motion.div
          style={{ y: heroY }}
          aria-hidden
          className="absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(0,224,255,0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E131B] via-[#0E131B] to-[#101826]" />
        </motion.div>

        <div className="px-6 text-center max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-semibold leading-tight"
          >
            Build a bank people <span className="text-[#00E0FF]">trust</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg text-[#9BB0C6]"
          >
            Join Horizon Bank to deliver clarity, safety, and speed—at scale.
          </motion.p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#open-roles"
              className="rounded-2xl bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-[#0E131B] px-6 py-3 font-medium inline-flex items-center gap-2 hover:scale-[1.02] transition"
            >
              View open roles <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#life"
              className="rounded-2xl bg-white/10 px-6 py-3 text-sm hover:bg-white/15 transition"
            >
              Life at Horizon
            </Link>
          </div>
        </div>
      </section>

      {/* EVP / WHY WORK HERE */}
      <section id="life" className="relative py-20 bg-gradient-to-b from-[#0E131B] to-[#101826]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(0,224,255,0.25)_0%,transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-3xl md:text-5xl font-semibold">Why Horizon Bank</h2>
          <p className="text-center text-[#9BB0C6] max-w-2xl mx-auto mt-3">
            A modern U.S. bank with classic discipline: service, resilience, and measurable outcomes.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {evp.map(([h, d], i) => (
              <motion.div
                key={h}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-[#101826]/90 ring-1 ring-white/10 backdrop-blur-xl"
              >
                <div className="text-lg font-medium">{h}</div>
                <p className="text-sm text-[#9BB0C6] mt-1">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CULTURE / HOW WE SERVE */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-stretch">
          <div className="rounded-3xl p-8 bg-[#0F1622] ring-1 ring-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Landmark className="opacity-80" />
              <h2 className="text-2xl md:text-4xl font-semibold">How we serve</h2>
            </div>
            <ul className="space-y-4 text-[#9BB0C6]">
              <li><b className="text-white/90">Customer-first.</b> Metrics that matter: first-contact resolution, dispute cycle time, fraud loss rate.</li>
              <li><b className="text-white/90">Reg-ready.</b> Documented policies, sound controls, and audit-proof execution.</li>
              <li><b className="text-white/90">Operational excellence.</b> Clear SLAs/SLOs across payments, cards, and support.</li>
              <li><b className="text-white/90">Continuous improvement.</b> We publish playbooks, calibrate quality, and close the loop.</li>
              <li><b className="text-white/90">Respect for time.</b> Efficient hiring, structured onboarding, and ongoing training.</li>
            </ul>

            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {[["99.98%", "Core uptime"], ["<24h", "Avg. dispute intake"], ["<5min", "Median support reply"]].map(
                ([n, l]) => (
                  <div key={l} className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="text-2xl font-semibold">{n}</div>
                    <div className="text-xs text-[#9BB0C6]">{l}</div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Accent panel (no images) */}
          <div className="rounded-3xl p-8 bg-gradient-to-br from-[#00E0FF]/10 to-transparent ring-1 ring-white/10">
            <h3 className="text-xl font-medium">Standards we live by</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#9BB0C6]">
              <li>• Treat every dollar like it’s yours.</li>
              <li>• Write it down. Policies beat folklore.</li>
              <li>• Controls are products. Design them with care.</li>
              <li>• Faster is safer—when procedures are crisp.</li>
              <li>• Own the outcome, not just the task.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ORGS & ROLES */}
      <section id="open-roles" className="bg-[#0F1622] py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-3xl md:text-5xl font-semibold">Where you can make impact</h2>
          <p className="text-center text-[#9BB0C6] max-w-2xl mx-auto mt-3">
            We hire proven operators and fast learners who care about doing the right thing—every time.
          </p>

          <div className="mt-12 grid lg:grid-cols-2 gap-8">
            {orgs.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-3xl ring-1 ring-white/10 bg-[#101826]/80 backdrop-blur-xl`}
              >
                <div className={`p-6 rounded-t-3xl bg-gradient-to-r ${t.accent}`} />
                <div className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-md bg-white/5">{t.icon}</span>
                    <h3 className="text-xl font-medium">{t.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-[#9BB0C6]">{t.blurb}</p>

                  <div className="mt-5 rounded-xl bg-white/5 p-4">
                    <div className="text-xs text-[#9BB0C6] mb-2">Representative roles</div>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {t.roles.map(([r, s]) => (
                        <li key={r} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                          <div>
                            <div className="text-sm">{r}</div>
                            <div className="text-xs text-[#9BB0C6]">{s}</div>
                          </div>
                          <Link href="#apply" className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/15">
                            Apply
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl md:text-5xl font-semibold text-center">Benefits that respect your life</h2>
        <p className="text-center text-[#9BB0C6] max-w-2xl mx-auto mt-3">
          We support health, family, learning, and long-term stability.
        </p>
        <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-6 mt-12">
          {benefits.map(([t, d], i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-6 rounded-2xl bg-[#101826] ring-1 ring-white/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="opacity-80" />
                <h3 className="font-medium">{t}</h3>
              </div>
              <p className="text-sm text-[#9BB0C6]">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HIRING PROCESS */}
      <section className="bg-[#0F1622] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-semibold text-center">Our hiring process</h2>
          <p className="text-center text-[#9BB0C6] max-w-2xl mx-auto mt-3">
            Structured, respectful, and efficient—optimized for signal and fit.
          </p>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
            {process.map(([h, d], i) => (
              <motion.div
                key={h}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-6 bg-[#101826] ring-1 ring-white/10"
              >
                <div className="text-[#00E0FF] font-semibold mb-1">{String(i + 1).padStart(2, "0")}</div>
                <div className="font-medium">{h}</div>
                <div className="text-sm text-[#9BB0C6] mt-1">{d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATIONS / OFFICES (US hubs) */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-10 items-stretch">
          <div className="rounded-3xl p-8 bg-[#0F1622] ring-1 ring-white/10">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="opacity-80" />
              <h2 className="text-2xl md:text-4xl font-semibold">Where we work</h2>
            </div>
            <p className="text-[#9BB0C6]">
              Remote-friendly across U.S. time zones, with hubs for collaboration and customer programs.
            </p>
            <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
              {[
                ["New York, NY", "Risk, Partnerships"],
                ["San Francisco, CA", "Product, Card Ops"],
                ["Austin, TX", "Customer Success, Fraud Ops"],
                ["Chicago, IL", "Treasury, Finance"],
                ["Miami, FL", "Payments Ops, Community"],
              ].map(([city, focus]) => (
                <div key={city} className="rounded-xl bg-white/5 p-4">
                  <div className="font-medium">{city}</div>
                  <div className="text-[#9BB0C6]">{focus}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative map-style panel */}
          <div className="rounded-3xl p-8 ring-1 ring-white/10 bg-gradient-to-br from-[#00B4D8]/10 via-transparent to-transparent">
            <h3 className="text-xl font-medium">U.S. coverage</h3>
            <p className="mt-2 text-sm text-[#9BB0C6]">
              Teams operate across EST, CST, and PST to keep our customer promise live end-to-end.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Core hours", "10am–4pm local, flexible"],
                ["Travel", "Role-dependent, light to moderate"],
                ["On-call", "Ops roles only, scheduled"],
                ["Collab", "Quarterly in-person sessions"],
              ].map(([h, d]) => (
                <div key={h} className="rounded-xl bg-white/5 p-4">
                  <div className="font-medium">{h}</div>
                  <div className="text-[#9BB0C6]">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DIVERSITY & INCLUSION */}
      <section className="bg-[#0F1622] py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-xs text-[#9BB0C6]">
            <Users2 className="w-4 h-4" /> Inclusive by design
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold">Different minds, one Horizon</h2>
          <p className="mt-3 text-[#9BB0C6] max-w-2xl mx-auto">
            We’re committed to equitable hiring, fair pay, and a workplace where everyone can do their best work.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-6">
            {[
              ["Structured interviews", "Rubrics and practical work reduce bias."],
              ["Comp transparency", "Levels & bands published internally."],
              ["Belonging programs", "Mentorship circles and ERGs."],
            ].map(([h, d]) => (
              <div key={h} className="rounded-2xl p-6 bg-[#101826] ring-1 ring-white/10">
                <div className="font-medium">{h}</div>
                <div className="text-sm text-[#9BB0C6] mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl md:text-5xl font-semibold text-center">FAQ</h2>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {faqs.map(([q, a]) => (
            <div key={q} className="rounded-2xl p-6 bg-[#101826] ring-1 ring-white/10">
              <div className="font-medium">{q}</div>
              <div className="text-sm text-[#9BB0C6] mt-1">{a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 text-center bg-gradient-to-b from-[#101826] to-[#0E131B]">
        <h2 className="text-4xl md:text-6xl font-semibold">Ready to serve with us?</h2>
        <p className="mt-4 text-[#9BB0C6] max-w-xl mx-auto">
          Tell us the customer outcomes you’re proudest of—and what you’ll own in year one.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="#open-roles"
            className="rounded-2xl bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-[#0E131B] px-8 py-3 font-medium inline-flex items-center gap-2 hover:scale-[1.02] transition"
          >
            See roles <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#life" className="rounded-2xl bg-white/10 px-8 py-3 text-sm hover:bg-white/15 transition">
            Life at Horizon
          </Link>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
