// app/security/page.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import NavBrand from "@/components/Navbrand";
import AppFooter from "@/components/Appfooter";
import {
  ShieldCheck, Lock, KeyRound, Fingerprint, Eye, EyeOff, Server, Globe2, Network,
  Bug, BellRing, SatelliteDish, Database, FileSearch, ClipboardCheck, Cpu, Activity,
  Cloud, DoorClosed, TimerReset, LifeBuoy, BadgeCheck, KeySquare, ShieldAlert, Link2,
  ScrollText, Code2, Wifi, Wallet, QrCode, Cable, AlarmClockCheck, BookOpenCheck
} from "lucide-react";

/**
 * Horizon Security — Cinematic, elongated, informative.
 * Put these under /public/security/ :
 *  - hero.jpg (abstract cyber / vault)
 *  - vault.jpg (lock/vault closeup)
 *  - network.jpg (global lines map)
 *  - soc.jpg (security operations center)
 *  - datacenter.jpg (server racks)
 *  - audit.jpg (documents/pen)
 */

export default function SecurityPage() {
  const { scrollYProgress } = useScroll();
  const parallax = useTransform(scrollYProgress, [0, 0.3], [0, -140]);

  return (
    <main className="min-h-svh bg-[#0E131B] text-[#E6EEF7]">
      <NavBrand />

      {/* HERO */}
      <section className="relative h-[92vh] overflow-hidden flex items-center">
        <motion.div style={{ y: parallax }} className="absolute inset-0 -z-10">
          <Image src="/Hero/cyber.jpg" alt="Security hero" fill priority className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E131B]/40 via-[#0E131B]/70 to-[#0E131B]" />
        </motion.div>

        <div className="mx-auto max-w-5xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-semibold leading-tight"
          >
            Built to protect your money and your <span className="text-[#00E0FF]">peace of mind</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg text-[#9BB0C6]"
          >
            Multi-layer defenses, zero-trust access, continuous monitoring, and clear promises—because security is a product feature.
          </motion.p>
        </div>
      </section>

      {/* COMPLIANCE / BADGES */}
      <section className="py-14 bg-gradient-to-b from-[#0E131B] to-[#101826]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl p-6 md:p-8 ring-1 ring-white/10 bg-[#101826]/80 backdrop-blur-xl">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {[
                ["PCI-DSS Level 1", "Cardholder data protected end-to-end"],
                ["SOC 2 Type II", "Security, availability, confidentiality"],
                ["ISO 27001", "ISMS certified & audited annually"],
                ["GDPR/NDPR", "Privacy by design & regional controls"],
              ].map(([t, d]) => (
                <div key={t} className="rounded-2xl bg-white/5 p-5">
                  <div className="flex items-center justify-center gap-2 text-base font-medium">
                    <BadgeCheck className="opacity-80" /> {t}
                  </div>
                  <div className="mt-2 text-xs text-[#9BB0C6]">{d}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-xs text-[#9BB0C6]">
              Independent audits, penetration tests, and continuous control monitoring.
            </div>
          </div>
        </div>
      </section>

      {/* THREAT MODEL */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-stretch">
          <div className="rounded-3xl p-8 bg-[#0F1622] ring-1 ring-white/10">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="opacity-80" />
              <h2 className="text-2xl md:text-4xl font-semibold">Our threat model</h2>
            </div>
            <ul className="space-y-4 text-[#9BB0C6]">
              <li><b className="text-white/90">Account takeover.</b> We defend with device binding, biometrics, and step-up verification.</li>
              <li><b className="text-white/90">Payment fraud.</b> Real-time anomaly scoring, velocity rules, MCC locks, and risk-based SCA.</li>
              <li><b className="text-white/90">Data exfiltration.</b> Encryption in transit/at rest, field-level tokenization, least-privilege access.</li>
              <li><b className="text-white/90">Insider risk.</b> Zero-trust, short-lived credentials, approvals & immutable audit trails.</li>
              <li><b className="text-white/90">Supply chain.</b> SBOMs, signed builds, dependency scanning, vendor reviews.</li>
            </ul>

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              {[
                [<Activity key="1" />, "24/7 monitoring"],
                [<FileSearch key="2" />, "Continuous logging"],
                [<BellRing key="3" />, "Alerting & playbooks"],
              ].map(([ic, t]) => (
                <div key={t as string} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm text-[#9BB0C6]">
                  <div className="p-1.5 rounded-md bg-white/5">{ic}</div>{t as string}
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10">
            <Image src="/Hero/vault.jpg" alt="Vault" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E131B]/70 to-transparent" />
          </div>
        </div>
      </section>

      {/* LAYERS OF DEFENSE */}
      <section className="bg-[#0F1622] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl md:text-5xl font-semibold">Layers of defense</h2>
          <p className="text-center text-[#9BB0C6] max-w-2xl mx-auto mt-3">Defense-in-depth from device to data center.</p>

          <div className="mt-12 grid lg:grid-cols-3 gap-6">
            <Card
              icon={<Fingerprint />}
              title="User & device"
              items={[
                "Passkeys & biometrics (Face/Touch ID)",
                "Device binding, jailbreak/root detection",
                "Step-up auth for sensitive actions",
                "Session pinning & inactivity locks",
              ]}
            />
            <Card
              icon={<Lock />}
              title="App & API"
              items={[
                "OWASP ASVS-driven SDLC",
                "Rate-limits, HSTS, strict CORS",
                "mTLS between services, JWT w/ short TTL",
                "Secrets in HSM/KMS, rotated automatically",
              ]}
            />
            <Card
              icon={<Server />}
              title="Platform & data"
              items={[
                "AES-256 at rest, TLS 1.3 in transit",
                "Row/field-level encryption & tokenization",
                "RBAC + ABAC, Just-In-Time credentials",
                "Backups w/ regular restore drills",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ENCRYPTION & KEY MGMT */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-10 items-stretch">
          <div className="rounded-3xl p-8 bg-[#101826] ring-1 ring-white/10">
            <div className="flex items-center gap-3 mb-3">
              <KeyRound /> <h3 className="text-2xl font-semibold">Encryption & key management</h3>
            </div>
            <ul className="list-disc list-inside text-[#9BB0C6] space-y-2">
              <li>All traffic uses TLS 1.3 with modern ciphers; HSTS + certificate pinning on apps.</li>
              <li>Data at rest is AES-256; sensitive fields additionally tokenized with format-preserving schemes.</li>
              <li>Keys live in cloud HSM/KMS with rotation, separation of duties, and quorum approvals.</li>
              <li>Customer secrets (PAN, CVV) handled in PCI-scoped enclaves; apps never see raw data.</li>
            </ul>
          </div>

          <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10">
            <Image src="/Hero/datacenter.jpg" alt="Datacenter" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E131B]/70 to-transparent" />
          </div>
        </div>
      </section>

      {/* FRAUD & ANOMALY DEFENSE */}
      <section className="bg-[#0F1622] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-stretch">
            <div className="rounded-3xl p-8 bg-[#101826] ring-1 ring-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Eye /> <h3 className="text-2xl font-semibold">Real-time fraud detection</h3>
              </div>
              <p className="text-[#9BB0C6]">
                We combine rules + ML models to score events in real time: device posture, velocity, geolocation, merchant category,
                and behavioral biometrics. High-risk actions trigger step-up auth or holds with instant in-app explanations.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-5">
                {[
                  [<Wallet key="1" />, "Card & transfer scoring"],
                  [<QrCode key="2" />, "QR/NFC risk signals"],
                  [<Cable key="3" />, "Mule & link analysis"],
                  [<EyeOff key="4" />, "Privacy-preserving features"],
                ].map(([ic, t]) => (
                  <div key={t as string} className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-sm text-[#9BB0C6]">
                    <div className="p-1.5 rounded-md bg-white/5">{ic}</div>{t as string}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10">
              <Image src="/Hero/soc.jpg" alt="SOC" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0E131B]/70 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ZERO-TRUST & ACCESS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-3xl p-8 bg-[#0F1622] ring-1 ring-white/10">
          <div className="flex items-center gap-3 mb-3">
            <DoorClosed /> <h3 className="text-2xl font-semibold">Zero-trust access</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Mini icon={<KeySquare />} title="Least privilege" body="RBAC + ABAC; ephemeral, scoped tokens; break-glass flows with approvals." />
            <Mini icon={<ScrollText />} title="Audit trails" body="Append-only logs for admin actions, config changes, and data access." />
            <Mini icon={<Code2 />} title="Secured SDLC" body="Static & dynamic analysis, IaC scanning, signed builds, SBOMs." />
          </div>
        </div>
      </section>

      {/* AVAILABILITY, BCP & BACKUPS */}
      <section className="bg-[#0F1622] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-10 items-stretch">
            <div className="rounded-3xl p-8 bg-[#101826] ring-1 ring-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Cloud /> <h3 className="text-2xl font-semibold">Availability & resilience</h3>
              </div>
              <ul className="list-disc list-inside text-[#9BB0C6] space-y-2">
                <li>Multi-AZ deployments; automated failover and self-healing.</li>
                <li>Blue/green & canary rollouts with automatic rollback.</li>
                <li>Rate-limiting, circuit breakers, and graceful degradation.</li>
                <li>External status page & public postmortems for major incidents.</li>
              </ul>
            </div>

            <div className="rounded-3xl p-8 bg-[#101826] ring-1 ring-white/10">
              <div className="flex items-center gap-3 mb-3">
                <TimerReset /> <h3 className="text-2xl font-semibold">Backups & recovery</h3>
              </div>
              <ul className="list-disc list-inside text-[#9BB0C6] space-y-2">
                <li>Encrypted, immutable backups with point-in-time recovery (PITR).</li>
                <li>Quarterly restore drills; RPO/RTO objectives tested & published.</li>
                <li>Disaster recovery playbooks & tabletop exercises.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-10 items-stretch">
          <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10">
            <Image src="/Hero/audit.jpg" alt="Audit" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E131B]/70 to-transparent" />
          </div>
          <div className="rounded-3xl p-8 bg-[#0F1622] ring-1 ring-white/10">
            <div className="flex items-center gap-3 mb-3">
              <BookOpenCheck /> <h3 className="text-2xl font-semibold">Privacy by design</h3>
            </div>
            <p className="text-[#9BB0C6]">
              Your data belongs to you. We minimize collection, purpose-limit processing, and give you clear controls.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <Mini icon={<Eye />} title="Transparent controls" body="Download, delete, and manage what we store." />
              <Mini icon={<Link2 />} title="Data boundaries" body="Regional hosting & residency options where applicable." />
            </div>
          </div>
        </div>
      </section>

      {/* INCIDENT RESPONSE & BUG BOUNTY */}
      <section className="bg-[#0F1622] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid md:grid-cols-2 gap-10 items-stretch">
            <div className="rounded-3xl p-8 bg-[#101826] ring-1 ring-white/10">
              <div className="flex items-center gap-3 mb-3">
                <AlarmClockCheck /> <h3 className="text-2xl font-semibold">Incident response</h3>
              </div>
              <p className="text-[#9BB0C6]">
                Dedicated on-call rotations with minute-level SLAs. We practice, measure, and publish summaries for learnings.
              </p>
              <ul className="list-disc list-inside text-[#9BB0C6] space-y-2 mt-3">
                <li>Runbooks, comms templates, and customer-first impact assessments.</li>
                <li>Regulator & partner notifications when required by law or contract.</li>
              </ul>
            </div>

            <div className="rounded-3xl p-8 bg-[#101826] ring-1 ring-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Bug /> <h3 className="text-2xl font-semibold">Bug bounty & disclosures</h3>
              </div>
              <p className="text-[#9BB0C6]">
                We welcome responsible researchers. Report vulnerabilities and we’ll respond quickly and fairly.
              </p>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <Mini icon={<ShieldCheck />} title="Safe harbor" body="Good-faith research protected by policy." />
                <Mini icon={<BadgeCheck />} title="Rewards" body="Bounties based on severity & impact." />
              </div>
              <div className="mt-4 text-sm">
                <span className="text-[#9BB0C6]">Email: </span>
                <a href="mailto:security@horizon.example" className="text-[#00E0FF] underline">security@horizon.example</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GLOBAL NETWORK MAP */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-3xl overflow-hidden ring-1 ring-white/10">
          <Image src="/Hero/network.jpg" alt="Global network" width={1600} height={700} className="w-full object-cover" />
        </div>
        <p className="mt-4 text-center text-sm text-[#9BB0C6]">
          Traffic traverses secure, distributed edges across multiple regions with strict routing & DDoS absorption.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-[#0F1622] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-5xl font-semibold text-center">Security FAQ</h2>
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {[
              ["Do you store card numbers?", "We tokenize PANs and never store CVV. PCI-scoped services handle sensitive data inside isolated vaults."],
              ["Can I get a SOC 2 report?", "Yes. Under NDA, we share our most recent SOC 2 Type II and penetration test summaries."],
              ["Where is my data hosted?", "We use regional clouds; options for EU/UK/NG residency where available."],
              ["How can I report a vuln?", "Email security@horizon.example with steps to reproduce. Our team will acknowledge within 24 hours."],
            ].map(([q, a]) => (
              <div key={q} className="rounded-2xl p-6 bg-[#101826] ring-1 ring-white/10">
                <div className="font-medium">{q}</div>
                <div className="text-sm text-[#9BB0C6] mt-1">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 text-center bg-gradient-to-b from-[#101826] to-[#0E131B]">
        <h2 className="text-4xl md:text-6xl font-semibold">Security is a promise we keep—daily.</h2>
        <p className="mt-3 text-[#9BB0C6] max-w-xl mx-auto">
          Explore our whitepapers, request audit reports, or talk to our security team.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <a className="rounded-2xl bg-gradient-to-r from-[#00B4D8] to-[#00E0FF] text-[#0E131B] px-8 py-3 font-medium">
            Request reports
          </a>
          <a href="mailto:security@horizon.example" className="rounded-2xl bg-white/10 px-8 py-3 text-sm hover:bg-white/15">
            Contact security
          </a>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}

/* ── tiny helpers ─────────────────────────────────────────── */

function Card({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl p-6 bg-[#101826] ring-1 ring-white/10"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
        <h3 className="font-medium">{title}</h3>
      </div>
      <ul className="mt-3 text-sm text-[#9BB0C6] space-y-2">
        {items.map((it) => (<li key={it} className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 opacity-70 mt-0.5" />{it}</li>))}
      </ul>
    </motion.div>
  );
}

function Mini({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl p-5 bg-[#101826] ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
        <div className="font-medium">{title}</div>
      </div>
      <div className="text-sm text-[#9BB0C6] mt-1">{body}</div>
    </div>
  );
}
